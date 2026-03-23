/**
 * UptradeTasksPanel - Task management panel for Uptrade admins
 * 
 * Features:
 * - List/Board view toggle
 * - Task creation with full form
 * - Quick task add
 * - Task detail drawer
 * - Checklist management
 * - Time grouping (Today, This Week, Overdue)
 */
import { useState, useMemo, useCallback } from 'react'
import {
  Plus, Search, Filter, LayoutList, LayoutGrid, Calendar,
  Clock, User, Tag, MoreVertical, CheckCircle2, Circle,
  AlertTriangle, ChevronRight, Paperclip, MessageSquare,
  Edit, Trash2, ArrowUp, ArrowDown, Minus
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format, isToday, isThisWeek, isPast, parseISO } from 'date-fns'

// UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/EmptyState'

// Store
import {
  UPTRADE_TASK_STATUS_CONFIG,
  UPTRADE_TASK_PRIORITY_CONFIG,
  UPTRADE_TASK_MODULE_CONFIG,
} from '@/lib/hooks'

// Priority icons
const PRIORITY_ICONS = {
  low: Minus,
  medium: Minus,
  high: ArrowUp,
  urgent: ArrowUp,
}

export function UptradeTasksPanel({
  tasks = [],
  teamMembers = [],
  projectId,
  viewMode = 'list',
  onViewModeChange,
  onTaskCreate,
  onTaskUpdate,
  onTaskComplete,
  onTaskDelete,
  onTaskSelect,
  isLoading = false,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [quickAddTitle, setQuickAddTitle] = useState('')
  const [selectedTasks, setSelectedTasks] = useState(new Set())

  // Group tasks by time
  const groupedTasks = useMemo(() => {
    let filtered = tasks

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(task =>
        task.title?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
      )
    }

    // Group by due date
    const today = []
    const thisWeek = []
    const overdue = []
    const upcoming = []
    const noDueDate = []
    const completed = []

    filtered.forEach(task => {
      if (task.status === 'completed') {
        completed.push(task)
        return
      }

      if (!task.due_date) {
        noDueDate.push(task)
        return
      }

      const dueDate = parseISO(task.due_date)

      if (isPast(dueDate) && !isToday(dueDate)) {
        overdue.push(task)
      } else if (isToday(dueDate)) {
        today.push(task)
      } else if (isThisWeek(dueDate)) {
        thisWeek.push(task)
      } else {
        upcoming.push(task)
      }
    })

    // Sort each group by priority then due date
    const sortTasks = (a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
      const aPriority = priorityOrder[a.priority] ?? 2
      const bPriority = priorityOrder[b.priority] ?? 2
      if (aPriority !== bPriority) return aPriority - bPriority
      if (a.due_date && b.due_date) {
        return new Date(a.due_date) - new Date(b.due_date)
      }
      return 0
    }

    return {
      overdue: overdue.sort(sortTasks),
      today: today.sort(sortTasks),
      thisWeek: thisWeek.sort(sortTasks),
      upcoming: upcoming.sort(sortTasks),
      noDueDate: noDueDate.sort(sortTasks),
      completed: completed.slice(0, 10), // Only show recent completed
    }
  }, [tasks, searchQuery])

  const handleQuickAdd = async (e) => {
    e.preventDefault()
    if (!quickAddTitle.trim()) return

    try {
      await onTaskCreate({
        title: quickAddTitle.trim(),
        status: 'not_started',
        priority: 'medium',
      })
      setQuickAddTitle('')
      toast.success('Task created')
    } catch (error) {
      toast.error('Failed to create task')
    }
  }

  const handleToggleComplete = async (task) => {
    try {
      if (task.status === 'completed') {
        await onTaskUpdate(task.id, { status: 'not_started' })
      } else {
        await onTaskComplete(task.id)
      }
    } catch (error) {
      toast.error('Failed to update task')
    }
  }

  const handleBulkComplete = async () => {
    // Implementation for bulk complete
    toast.info('Completing selected tasks...')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => onViewModeChange?.('list')}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'board' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => onViewModeChange?.('board')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button size="sm" onClick={() => onTaskSelect?.(null)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Quick Add */}
      <form onSubmit={handleQuickAdd} className="p-4 border-b bg-muted/30">
        <div className="flex gap-2">
          <Input
            placeholder="Quick add task... Press Enter to save"
            value={quickAddTitle}
            onChange={(e) => setQuickAddTitle(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" disabled={!quickAddTitle.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {/* Task List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Overdue */}
          {groupedTasks.overdue.length > 0 && (
            <TaskGroup
              title="Overdue"
              icon={AlertTriangle}
              iconColor="text-red-500"
              tasks={groupedTasks.overdue}
              teamMembers={teamMembers}
              onToggleComplete={handleToggleComplete}
              onTaskSelect={onTaskSelect}
              onTaskDelete={onTaskDelete}
            />
          )}

          {/* Today */}
          {groupedTasks.today.length > 0 && (
            <TaskGroup
              title={`Today - ${format(new Date(), 'MMMM d, yyyy')}`}
              icon={Calendar}
              tasks={groupedTasks.today}
              teamMembers={teamMembers}
              onToggleComplete={handleToggleComplete}
              onTaskSelect={onTaskSelect}
              onTaskDelete={onTaskDelete}
            />
          )}

          {/* This Week */}
          {groupedTasks.thisWeek.length > 0 && (
            <TaskGroup
              title="This Week"
              icon={Calendar}
              tasks={groupedTasks.thisWeek}
              teamMembers={teamMembers}
              onToggleComplete={handleToggleComplete}
              onTaskSelect={onTaskSelect}
              onTaskDelete={onTaskDelete}
            />
          )}

          {/* Upcoming */}
          {groupedTasks.upcoming.length > 0 && (
            <TaskGroup
              title="Upcoming"
              icon={Calendar}
              tasks={groupedTasks.upcoming}
              teamMembers={teamMembers}
              onToggleComplete={handleToggleComplete}
              onTaskSelect={onTaskSelect}
              onTaskDelete={onTaskDelete}
            />
          )}

          {/* No Due Date */}
          {groupedTasks.noDueDate.length > 0 && (
            <TaskGroup
              title="No Due Date"
              tasks={groupedTasks.noDueDate}
              teamMembers={teamMembers}
              onToggleComplete={handleToggleComplete}
              onTaskSelect={onTaskSelect}
              onTaskDelete={onTaskDelete}
            />
          )}

          {/* Completed */}
          {groupedTasks.completed.length > 0 && (
            <TaskGroup
              title="Recently Completed"
              icon={CheckCircle2}
              iconColor="text-emerald-500"
              tasks={groupedTasks.completed}
              teamMembers={teamMembers}
              onToggleComplete={handleToggleComplete}
              onTaskSelect={onTaskSelect}
              onTaskDelete={onTaskDelete}
              collapsed
            />
          )}

          {/* Empty State */}
          {tasks.length === 0 && !isLoading && (
            <EmptyState
              icon={CheckCircle2}
              title="No tasks yet"
              description="Create your first task to get started"
              actionLabel={onTaskSelect ? 'Add Task' : undefined}
              onAction={onTaskSelect ? () => onTaskSelect(null) : undefined}
              compact
            />
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// Task Group Component
function TaskGroup({
  title,
  icon: Icon,
  iconColor,
  tasks,
  teamMembers,
  onToggleComplete,
  onTaskSelect,
  onTaskDelete,
  collapsed: defaultCollapsed = false,
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 mb-2 text-sm font-medium hover:text-primary transition-colors"
      >
        <ChevronRight className={cn(
          "h-4 w-4 transition-transform",
          !collapsed && "rotate-90"
        )} />
        {Icon && <Icon className={cn("h-4 w-4", iconColor)} />}
        <span>{title}</span>
        <Badge variant="secondary" className="h-5 px-1.5">
          {tasks.length}
        </Badge>
      </button>

      {!collapsed && (
        <div className="space-y-1 ml-6">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              teamMembers={teamMembers}
              onToggleComplete={onToggleComplete}
              onSelect={onTaskSelect}
              onDelete={onTaskDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Individual Task Row
function TaskRow({
  task,
  teamMembers,
  onToggleComplete,
  onSelect,
  onDelete,
}) {
  const statusConfig = UPTRADE_TASK_STATUS_CONFIG[task.status]
  const priorityConfig = UPTRADE_TASK_PRIORITY_CONFIG[task.priority]
  const moduleConfig = task.module ? UPTRADE_TASK_MODULE_CONFIG[task.module] : null
  const PriorityIcon = PRIORITY_ICONS[task.priority] || Minus

  const assignees = useMemo(() => {
    if (!task.assigned_to?.length) return []
    return task.assigned_to.map(id => 
      teamMembers.find(m => m.id === id)
    ).filter(Boolean)
  }, [task.assigned_to, teamMembers])

  const checklistProgress = useMemo(() => {
    if (!task.checklist?.length) return null
    const completed = task.checklist.filter(item => item.completed).length
    return { completed, total: task.checklist.length }
  }, [task.checklist])

  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-2 rounded-lg border bg-[var(--glass-bg)] hover:shadow-sm transition-all cursor-pointer",
        task.status === 'completed' && "opacity-60"
      )}
      onClick={() => onSelect?.(task)}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleComplete?.(task)
        }}
        className="shrink-0"
      >
        {task.status === 'completed' ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
        )}
      </button>

      {/* Title & Meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-medium truncate",
            task.status === 'completed' && "line-through text-muted-foreground"
          )}>
            {task.title}
          </span>
          
          {/* Priority indicator */}
          {task.priority && task.priority !== 'medium' && (
            <PriorityIcon className={cn(
              "h-3.5 w-3.5 shrink-0",
              task.priority === 'urgent' && "text-red-500",
              task.priority === 'high' && "text-orange-500",
              task.priority === 'low' && "text-slate-400"
            )} />
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          {moduleConfig && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              {moduleConfig.icon} {moduleConfig.label}
            </Badge>
          )}
          
          {task.due_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(parseISO(task.due_date), 'MMM d')}
            </span>
          )}
          
          {checklistProgress && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {checklistProgress.completed}/{checklistProgress.total}
            </span>
          )}
          
          {task.attachments?.length > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              {task.attachments.length}
            </span>
          )}
        </div>
      </div>

      {/* Assignees */}
      {assignees.length > 0 && (
        <div className="flex -space-x-1.5">
          {assignees.slice(0, 3).map((user) => (
            <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="text-[10px]">
                {user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          ))}
          {assignees.length > 3 && (
            <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium">
              +{assignees.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onSelect?.(task)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete?.(task.id)
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default UptradeTasksPanel
