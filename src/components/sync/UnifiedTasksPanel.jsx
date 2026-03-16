// src/components/sync/UnifiedTasksPanel.jsx
// Motion-style command center - "What you need to do today"
// Aggregates tasks from all sources: project_tasks, uptrade_tasks, crm_reminders, signal_actions

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Zap,
  Brain,
  ClipboardList,
  Briefcase,
  Users,
  Calendar,
  Bell,
  Sparkles,
  CheckSquare,
  Circle,
  Timer,
  ThumbsUp,
  ThumbsDown,
  Eye,
  MoreHorizontal,
  ExternalLink,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { syncApi } from '@/lib/portal-api'
import { budgetApi } from '@/lib/signal-api'
import useAuthStore from '@/lib/auth-store'
import { toast } from 'sonner'
import SignalIcon from '@/components/ui/SignalIcon'
import AddTaskDialog from './AddTaskDialog'
import AutoScheduleDialog from './AutoScheduleDialog'
import SuggestedTasksSection from './SuggestedTasksSection'
import KeyboardShortcutsDialog from './KeyboardShortcutsDialog'
import useKeyboardShortcuts from './useKeyboardShortcuts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

// ============================================================================
// TASK CARD COMPONENT
// ============================================================================

function TaskCard({ 
  task, 
  onComplete, 
  onView, 
  onAutoSchedule, 
  compact = false,
  batchMode = false,
  isSelected = false,
  onToggleSelect,
  isKeyboardSelected = false
}) {
  const getSourceConfig = (sourceType) => {
    switch (sourceType) {
      case 'project_task':
        return { icon: ClipboardList, label: 'Project', color: 'teal' }
      case 'uptrade_task':
        return { icon: Briefcase, label: 'Sonor', color: 'violet' }
      case 'crm_reminder':
        return { icon: Users, label: 'CRM', color: 'amber' }
      case 'signal_action':
        return { icon: Zap, label: 'Signal', color: 'emerald' }
      default:
        return { icon: CheckSquare, label: 'Task', color: 'gray' }
    }
  }

  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'urgent':
        return { color: 'red', label: 'Urgent' }
      case 'high':
        return { color: 'amber', label: 'High' }
      case 'normal':
      case 'medium':
        return { color: 'teal', label: 'Normal' }
      case 'low':
        return { color: 'gray', label: 'Low' }
      default:
        return { color: 'gray', label: '' }
    }
  }

  const source = getSourceConfig(task.source_type)
  const priority = getPriorityConfig(task.priority)
  const SourceIcon = source.icon

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === date.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
    if (isTomorrow) {
      return 'Tomorrow'
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer group",
          isKeyboardSelected && "ring-2 ring-primary ring-offset-1",
          isSelected && "bg-primary/5"
        )}
        onClick={() => batchMode ? onToggleSelect?.() : onView?.(task)}
      >
        {batchMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div className={cn(
          "p-1 rounded",
          `bg-${source.color}-100 dark:bg-${source.color}-500/20`
        )} style={{ backgroundColor: `var(--${source.color}-100, rgba(20, 184, 166, 0.1))` }}>
          <SourceIcon className="h-3.5 w-3.5" style={{ color: `var(--${source.color}-600, #0d9488)` }} />
        </div>
        <span className="flex-1 text-sm truncate">{task.title}</span>
        {task.due_at && (
          <span className="text-xs text-muted-foreground">{formatTime(task.due_at)}</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            onComplete?.(task)
          }}
        >
          <CheckCircle className="h-4 w-4" />
        </Button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-xl border bg-card hover:shadow-md transition-all cursor-pointer group",
        task.priority === 'urgent' && "border-red-300 dark:border-red-500/30",
        task.priority === 'high' && "border-amber-300 dark:border-amber-500/30",
        isKeyboardSelected && "ring-2 ring-primary ring-offset-2",
        isSelected && "bg-primary/5 border-primary/30"
      )}
      onClick={() => batchMode ? onToggleSelect?.() : onView?.(task)}
    >
      <div className="flex items-start gap-3">
        {/* Batch Selection Checkbox */}
        {batchMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="mt-1"
          />
        )}

        {/* Source Icon */}
        <div className={cn(
          "p-2 rounded-lg shrink-0",
          `bg-${source.color}-100 dark:bg-${source.color}-500/20`
        )} style={{ backgroundColor: `color-mix(in srgb, var(--brand-primary) 15%, transparent)` }}>
          <SourceIcon className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{task.title}</span>
            {priority.label && task.priority !== 'normal' && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] h-5",
                  task.priority === 'urgent' && "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
                  task.priority === 'high' && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                )}
              >
                {priority.label}
              </Badge>
            )}
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Badge variant="secondary" className="text-[10px] h-5 font-normal">
                {source.label}
              </Badge>
            </span>
            {task.module && task.module !== source.label.toLowerCase() && (
              <span className="capitalize">{task.module}</span>
            )}
            {task.due_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(task.due_at)}
              </span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView?.(task)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAutoSchedule?.(task)}>
              <Calendar className="h-4 w-4 mr-2" />
              Auto-Schedule
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onComplete?.(task)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Complete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  )
}

// ============================================================================
// DECISION CARD (Signal Action requiring approval)
// ============================================================================

function DecisionCard({ action, onApprove, onReject, onView, processingActionId }) {
  const isProcessing = processingActionId === action.id
  const getTierConfig = (tier) => {
    switch (tier) {
      case 4:
        return { label: 'Critical', color: 'red', bg: 'bg-red-100 dark:bg-red-500/20' }
      case 3:
        return { label: 'Review Required', color: 'amber', bg: 'bg-amber-100 dark:bg-amber-500/20' }
      default:
        return { label: 'Action', color: 'gray', bg: 'bg-gray-100 dark:bg-gray-500/20' }
    }
  }

  const tier = getTierConfig(action.tier)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-xl border-2 bg-card",
        action.tier === 4 && "border-red-300 dark:border-red-500/40 bg-red-50/30 dark:bg-red-500/5",
        action.tier === 3 && "border-amber-300 dark:border-amber-500/40 bg-amber-50/30 dark:bg-amber-500/5"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", tier.bg)}>
          <SignalIcon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge 
              className={cn(
                "text-[10px]",
                action.tier === 4 && "bg-red-500 hover:bg-red-600",
                action.tier === 3 && "bg-amber-500 hover:bg-amber-600"
              )}
            >
              {tier.label}
            </Badge>
            <span className="text-xs text-muted-foreground capitalize">
              {action.action_category || action.skill_key}
            </span>
          </div>

          <h4 className="font-medium text-sm mb-1">
            {action.action_type}: {action.action_target}
          </h4>

          {action.reasoning && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {action.reasoning}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              className="h-8 bg-emerald-500 hover:bg-emerald-600"
              onClick={() => onApprove?.(action)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <ThumbsUp className="h-3.5 w-3.5 mr-1" />
              )}
              Approve
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="h-8"
              onClick={() => onView?.(action)}
              disabled={isProcessing}
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Review
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => onReject?.(action)}
              disabled={isProcessing}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// ACTIVITY ITEM (What Signal Did)
// ============================================================================

function ActivityItem({ action }) {
  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 py-2"
    >
      <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
        <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium capitalize">{action.action_type}</span>
          {' '}
          <span className="text-muted-foreground">{action.action_target}</span>
        </p>
        <span className="text-xs text-muted-foreground">{formatTime(action.completed_at)}</span>
      </div>
    </motion.div>
  )
}

// ============================================================================
// SECTION COMPONENT
// ============================================================================

function Section({ title, icon: Icon, count, children, collapsible = true, defaultOpen = true, emptyMessage }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="mb-6">
      <button
        onClick={() => collapsible && setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 w-full text-left mb-3",
          collapsible && "cursor-pointer"
        )}
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-sm">{title}</span>
        {count > 0 && (
          <Badge variant="secondary" className="ml-1 h-5 text-xs">
            {count}
          </Badge>
        )}
        {collapsible && (
          <ChevronDown className={cn(
            "h-4 w-4 ml-auto text-muted-foreground transition-transform",
            !isOpen && "-rotate-90"
          )} />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {React.Children.count(children) > 0 ? children : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {emptyMessage || 'No items'}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UnifiedTasksPanel({ projectId, projectIds, className, onTaskClick, onShowShortcuts }) {
  const { user } = useAuthStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [processingActionId, setProcessingActionId] = useState(null)
  const [rejectingAction, setRejectingAction] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectSubmitting, setRejectSubmitting] = useState(false)
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false)
  const [autoScheduleTask, setAutoScheduleTask] = useState(null)
  
  // Keyboard shortcuts state
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(-1)
  
  // Batch selection state
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set())
  const [batchMode, setBatchMode] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const result = await syncApi.getUnifiedTasks(projectId, projectIds)
      setData(result.data || result)
      // Clear batch selection on refresh
      setSelectedTaskIds(new Set())
      setBatchMode(false)
    } catch (err) {
      console.error('Failed to load unified tasks:', err)
      setError(err.message || 'Failed to load tasks')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [projectId, projectIds?.length, projectIds?.join(',')])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Flatten all tasks for keyboard navigation
  const allTasks = React.useMemo(() => {
    if (!data) return []
    const { needs_decision = [], today = [], overdue = [], upcoming = [] } = data
    return [...needs_decision, ...overdue, ...today, ...upcoming]
  }, [data])

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled: !addTaskDialogOpen && !autoScheduleTask && !rejectingAction && !showShortcutsHelp,
    tasks: allTasks,
    selectedIndex: selectedTaskIndex,
    onSelectIndex: setSelectedTaskIndex,
    onNewTask: () => setAddTaskDialogOpen(true),
    onComplete: (task) => handleComplete(task),
    onApprove: (task) => handleApprove(task),
    onReject: (task) => handleRejectClick(task),
    onAutoSchedule: (task) => setAutoScheduleTask(task),
    onView: (task) => onTaskClick?.(task),
    onShowHelp: () => onShowShortcuts ? onShowShortcuts() : setShowShortcutsHelp(true),
    onJumpToSection: (section) => {
      // Scroll to section
      const el = document.getElementById(`sync-section-${section}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
  })

  // Batch selection helpers
  const toggleTaskSelection = useCallback((taskId) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }, [])

  const selectAllTasks = useCallback(() => {
    const ids = allTasks.map(t => t.source_id || t.id)
    setSelectedTaskIds(new Set(ids))
  }, [allTasks])

  const clearSelection = useCallback(() => {
    setSelectedTaskIds(new Set())
    setBatchMode(false)
  }, [])

  const handleBatchComplete = async () => {
    if (selectedTaskIds.size === 0) return
    try {
      await syncApi.batchUpdateTaskStatus({ taskIds: [...selectedTaskIds], status: 'completed' })
      toast.success(`Marked ${selectedTaskIds.size} tasks as complete`)
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to update tasks')
    }
    clearSelection()
    loadData()
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const handleComplete = async (task) => {
    const taskId = task.id ?? task.task_id
    try {
      await syncApi.updateTaskStatus(taskId, { status: 'completed' })
      toast.success(`Marked "${task.title}" as complete`)
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to update task')
    }
    loadData()
  }

  const handleView = (task) => {
    onTaskClick?.(task)
  }

  const handleAutoSchedule = (task) => {
    setAutoScheduleTask(task)
  }

  const handleApprove = async (action) => {
    if (!user?.id) {
      toast.error('Please sign in to approve actions.')
      return
    }
    setProcessingActionId(action.id)
    try {
      await budgetApi.approveAction(action.id, user.id)
      toast.success('Action approved. Signal will execute it.')
      loadData()
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to approve'
      toast.error(msg)
    } finally {
      setProcessingActionId(null)
    }
  }

  const handleRejectClick = (action) => {
    setRejectingAction(action)
    setRejectReason('')
  }

  const handleRejectConfirm = async () => {
    if (!rejectingAction) return
    if (!user?.id) {
      toast.error('Please sign in to reject actions.')
      return
    }
    setRejectSubmitting(true)
    try {
      await budgetApi.rejectAction(
        rejectingAction.id,
        user.id,
        rejectReason.trim() || 'Rejected from Sync'
      )
      toast.success('Action rejected.')
      setRejectingAction(null)
      setRejectReason('')
      loadData()
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to reject'
      toast.error(msg)
    } finally {
      setRejectSubmitting(false)
    }
  }

  const handleRejectCancel = () => {
    setRejectingAction(null)
    setRejectReason('')
  }

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("py-8 text-center", className)}>
        <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-3">{error}</p>
        <Button size="sm" variant="outline" onClick={handleRefresh}>
          Try Again
        </Button>
      </div>
    )
  }

  const { needs_decision = [], today = [], overdue = [], upcoming = [], completed_today = [], summary = {} } = data || {}

  const handleTaskCreated = (task) => {
    // Refresh the task list when a new task is created
    loadData()
  }

  return (
    <div className={cn("", className)}>
      {/* Header with Stats */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold">Today's Focus</h2>
          <p className="text-sm text-muted-foreground">
            {summary.today_count || 0} tasks today
            {(summary.overdue_count || 0) > 0 && (
              <span className="text-red-500"> · {summary.overdue_count} overdue</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Batch mode toggle */}
          {batchMode ? (
            <>
              <span className="text-xs text-muted-foreground">
                {selectedTaskIds.size} selected
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={selectAllTasks}
              >
                Select All
              </Button>
              <Button 
                size="sm"
                variant="default"
                onClick={handleBatchComplete}
                disabled={selectedTaskIds.size === 0}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={clearSelection}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => setBatchMode(true)}
                    >
                      <CheckSquare className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Batch select</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button 
                size="sm"
                onClick={() => setAddTaskDialogOpen(true)}
                style={{ backgroundColor: 'var(--brand-primary)' }}
                className="hover:opacity-90"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Decisions</span>
          </div>
          <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
            {summary.needs_decision_count || 0}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-xs font-medium text-red-700 dark:text-red-400">Overdue</span>
          </div>
          <span className="text-2xl font-bold text-red-700 dark:text-red-400">
            {summary.overdue_count || 0}
          </span>
        </div>
        <div className="p-3 rounded-xl" style={{ 
          backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)',
          borderWidth: 1,
          borderColor: 'color-mix(in srgb, var(--brand-primary) 30%, transparent)'
        }}>
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--brand-primary)' }}>Today</span>
          </div>
          <span className="text-2xl font-bold" style={{ color: 'var(--brand-primary)' }}>
            {summary.today_count || 0}
          </span>
        </div>
      </div>

      {/* Task sections - no nested scroll, let parent handle it */}
      <div className="space-y-4 pb-6">
        {/* Needs Decision - Most important */}
        {needs_decision.length > 0 && (
          <Section 
            title="Needs Your Decision" 
            icon={Bell} 
            count={needs_decision.length}
            defaultOpen={true}
          >
            <div className="space-y-3">
              {needs_decision.map((action) => (
                <DecisionCard
                  key={action.source_id || action.id}
                  action={action}
                  onApprove={handleApprove}
                  onReject={handleRejectClick}
                  onView={handleView}
                  processingActionId={processingActionId}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Signal Suggestions - CRM follow-ups and other AI recommendations */}
        <SuggestedTasksSection 
          projectId={projectId}
          onTaskCreated={loadData}
        />

        {/* Overdue Tasks - Urgent */}
        {overdue.length > 0 && (
          <div id="sync-section-overdue">
            <Section 
              title="Overdue" 
              icon={AlertTriangle} 
              count={overdue.length}
              defaultOpen={true}
            >
              <div className="space-y-2">
                {overdue.map((task, index) => (
                  <TaskCard
                    key={task.source_id}
                    task={task}
                    onComplete={handleComplete}
                    onView={handleView}
                    onAutoSchedule={handleAutoSchedule}
                    batchMode={batchMode}
                    isSelected={selectedTaskIds.has(task.source_id)}
                    onToggleSelect={() => toggleTaskSelection(task.source_id)}
                    isKeyboardSelected={selectedTaskIndex === index}
                  />
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* Today's Tasks */}
        <div id="sync-section-today">
          <Section 
            title="Today" 
            icon={Target} 
            count={today.length}
            defaultOpen={true}
            emptyMessage="No tasks due today 🎉"
          >
            <div className="space-y-2">
              {today.map((task) => {
                const globalIndex = overdue.length + today.indexOf(task)
                return (
                  <TaskCard
                    key={task.source_id}
                    task={task}
                    onComplete={handleComplete}
                    onView={handleView}
                    onAutoSchedule={handleAutoSchedule}
                    batchMode={batchMode}
                    isSelected={selectedTaskIds.has(task.source_id)}
                    onToggleSelect={() => toggleTaskSelection(task.source_id)}
                    isKeyboardSelected={selectedTaskIndex === globalIndex}
                  />
                )
              })}
            </div>
          </Section>
        </div>

        {/* Upcoming Tasks */}
        <Section 
          title="Coming Up" 
          icon={Calendar} 
          count={upcoming.length}
          defaultOpen={upcoming.length < 10}
          emptyMessage="Nothing scheduled this week"
        >
          <div className="space-y-1">
            {upcoming.map((task) => {
              const globalIndex = overdue.length + today.length + upcoming.indexOf(task)
              return (
                <TaskCard
                  key={task.source_id}
                  task={task}
                  onComplete={handleComplete}
                  onView={handleView}
                  onAutoSchedule={handleAutoSchedule}
                  compact
                  batchMode={batchMode}
                  isSelected={selectedTaskIds.has(task.source_id)}
                  onToggleSelect={() => toggleTaskSelection(task.source_id)}
                  isKeyboardSelected={selectedTaskIndex === globalIndex}
                />
              )
            })}
          </div>
        </Section>

        {/* Signal Activity - What was done */}
        {completed_today.length > 0 && (
          <Section 
            title="Signal Activity" 
            icon={Sparkles} 
            count={completed_today.length}
            defaultOpen={false}
          >
            <div className="divide-y">
              {completed_today.map((action) => (
                <ActivityItem key={action.id} action={action} />
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Reject action dialog */}
      <Dialog open={!!rejectingAction} onOpenChange={(open) => !open && handleRejectCancel()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject action</DialogTitle>
            <DialogDescription>
              {rejectingAction && (
                <>Signal suggested: {rejectingAction.action_type} – {rejectingAction.action_target}. Add a reason (optional) and confirm to reject.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="reject-reason">Reason (optional)</Label>
              <Textarea
                id="reject-reason"
                placeholder="e.g. Not the right time, need more context…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="resize-none"
                disabled={rejectSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleRejectCancel} disabled={rejectSubmitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectSubmitting}
            >
              {rejectSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting…
                </>
              ) : (
                'Reject'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <AddTaskDialog
        open={addTaskDialogOpen}
        onOpenChange={setAddTaskDialogOpen}
        projectId={projectId}
        onTaskCreated={handleTaskCreated}
      />

      {/* Auto-Schedule Dialog */}
      <AutoScheduleDialog
        open={!!autoScheduleTask}
        onOpenChange={(open) => !open && setAutoScheduleTask(null)}
        task={autoScheduleTask}
        onScheduled={loadData}
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsDialog
        open={showShortcutsHelp}
        onOpenChange={setShowShortcutsHelp}
      />
    </div>
  )
}
