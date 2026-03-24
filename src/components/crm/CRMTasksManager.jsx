/**
 * CRMTasksManager - Full tasks management with Sync calendar integration
 * 
 * Features:
 * - Create/edit/delete tasks
 * - Link tasks to prospects
 * - Schedule task reminders with Sync calendar
 * - Due date tracking with calendar view
 * - Priority levels
 * - Status tracking (pending, in-progress, completed)
 * - Bulk actions
 * - Filters by status, priority, prospect
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Plus,
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  CheckSquare,
  ListTodo,
  CalendarPlus,
  X,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { crmApi, syncApi } from '@/lib/sonor-api'
import { toast } from '@/lib/toast'
import { format, isPast, isToday, isTomorrow } from 'date-fns'

// Priority configurations
const PRIORITY_CONFIG = {
  low: {
    label: 'Low',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30'
  },
  medium: {
    label: 'Medium',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30'
  },
  high: {
    label: 'High',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    border: 'border-orange-200 dark:border-orange-500/30'
  },
  urgent: {
    label: 'Urgent',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/30'
  }
}

export default function CRMTasksManager({ projectId, brandColors }) {
  const [tasks, setTasks] = useState([])
  const [prospects, setProspects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all, pending, in_progress, completed
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [prospectFilter, setProspectFilter] = useState('all')
  
  // Task dialog state
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    prospect_id: null,
    due_date: '',
    priority: 'medium',
    status: 'pending',
    schedule_sync_event: false, // Create calendar event in Sync
    sync_event_duration: 30, // minutes
  })

  // Fetch tasks and prospects
  useEffect(() => {
    fetchTasks()
    fetchProspects()
  }, [projectId])

  const fetchTasks = useCallback(async () => {
    if (!projectId) return
    
    setIsLoading(true)
    try {
      const response = await crmApi.listTasks({ project_id: projectId })
      setTasks(response.data || [])
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
      toast.error('Failed to load tasks')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  const fetchProspects = useCallback(async () => {
    if (!projectId) return
    
    try {
      const response = await crmApi.listProspects({ project_id: projectId })
      // API returns { prospects: [...], total, summary, pagination }
      setProspects(response.data?.prospects || [])
    } catch (err) {
      console.error('Failed to fetch prospects:', err)
    }
  }, [projectId])

  // Filtered tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = searchQuery === '' || 
      task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
    const matchesProspect = prospectFilter === 'all' || task.prospect_id === prospectFilter
    
    return matchesSearch && matchesStatus && matchesPriority && matchesProspect
  })

  // Group tasks by status
  const tasksByStatus = {
    pending: filteredTasks.filter(t => t.status === 'pending'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    completed: filteredTasks.filter(t => t.status === 'completed')
  }

  // Create/update task
  const handleSaveTask = async () => {
    if (!taskForm.title.trim()) {
      toast.error('Task title is required')
      return
    }

    setIsCreating(true)
    try {
      const payload = {
        ...taskForm,
        project_id: projectId,
      }

      let response
      if (editingTask) {
        response = await crmApi.updateTask(editingTask.id, payload)
        toast.success('Task updated')
      } else {
        response = await crmApi.createTask(payload)
        toast.success('Task created')
        
        // If scheduled with Sync, create calendar event
        if (taskForm.schedule_sync_event && taskForm.due_date) {
          try {
            await syncApi.createEvent({
              title: `Task: ${taskForm.title}`,
              description: taskForm.description,
              start_time: taskForm.due_date,
              duration: taskForm.sync_event_duration,
              event_type: 'task',
              related_id: response.data.id,
              related_type: 'crm_task'
            })
            toast.success('Calendar event created in Sync')
          } catch (err) {
            console.error('Failed to create Sync event:', err)
            toast.error('Task created but calendar event failed')
          }
        }
      }

      fetchTasks()
      closeTaskDialog()
    } catch (err) {
      console.error('Failed to save task:', err)
      toast.error(editingTask ? 'Failed to update task' : 'Failed to create task')
    } finally {
      setIsCreating(false)
    }
  }

  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return
    
    try {
      await crmApi.deleteTask(taskId)
      toast.success('Task deleted')
      fetchTasks()
    } catch (err) {
      console.error('Failed to delete task:', err)
      toast.error('Failed to delete task')
    }
  }

  // Toggle task status
  const handleToggleStatus = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    
    try {
      await crmApi.updateTask(task.id, { status: newStatus })
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
      toast.success(newStatus === 'completed' ? 'Task completed!' : 'Task reopened')
    } catch (err) {
      console.error('Failed to update task:', err)
      toast.error('Failed to update task')
    }
  }

  // Bulk complete
  const handleBulkComplete = async () => {
    if (selectedTasks.length === 0) return
    
    try {
      await Promise.all(
        selectedTasks.map(id => crmApi.updateTask(id, { status: 'completed' }))
      )
      toast.success(`${selectedTasks.length} tasks completed`)
      setSelectedTasks([])
      fetchTasks()
    } catch (err) {
      console.error('Failed to complete tasks:', err)
      toast.error('Failed to complete tasks')
    }
  }

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return
    if (!confirm(`Delete ${selectedTasks.length} tasks?`)) return
    
    try {
      await Promise.all(
        selectedTasks.map(id => crmApi.deleteTask(id))
      )
      toast.success(`${selectedTasks.length} tasks deleted`)
      setSelectedTasks([])
      fetchTasks()
    } catch (err) {
      console.error('Failed to delete tasks:', err)
      toast.error('Failed to delete tasks')
    }
  }

  // Open dialog for create/edit
  const openCreateDialog = () => {
    setEditingTask(null)
    setTaskForm({
      title: '',
      description: '',
      prospect_id: null,
      due_date: '',
      priority: 'medium',
      status: 'pending',
      schedule_sync_event: false,
      sync_event_duration: 30,
    })
    setIsTaskDialogOpen(true)
  }

  const openEditDialog = (task) => {
    setEditingTask(task)
    setTaskForm({
      title: task.title || '',
      description: task.description || '',
      prospect_id: task.prospect_id,
      due_date: task.due_date || '',
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      schedule_sync_event: false,
      sync_event_duration: 30,
    })
    setIsTaskDialogOpen(true)
  }

  const closeTaskDialog = () => {
    setIsTaskDialogOpen(false)
    setEditingTask(null)
  }

  // Format due date
  const formatDueDate = (dueDate) => {
    if (!dueDate) return null
    const date = new Date(dueDate)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    if (isPast(date)) return `Overdue - ${format(date, 'MMM d')}`
    return format(date, 'MMM d, yyyy')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ListTodo className="h-6 w-6" style={{ color: brandColors.primary }} />
              Tasks
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage follow-ups and action items
            </p>
          </div>
          <Button
            onClick={openCreateDialog}
            style={{ backgroundColor: brandColors.primary, color: 'white' }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>

        {/* Filters & Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          <Select value={prospectFilter} onValueChange={setProspectFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Prospect" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prospects</SelectItem>
              {prospects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedTasks.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkComplete}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Complete ({selectedTasks.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tasks List */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: brandColors.primary }} />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <ListTodo className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || prospectFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first task to get started'}
              </p>
              {!searchQuery && statusFilter === 'all' && priorityFilter === 'all' && prospectFilter === 'all' && (
                <Button
                  onClick={openCreateDialog}
                  style={{ backgroundColor: brandColors.primary, color: 'white' }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pending Tasks */}
              {tasksByStatus.pending.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Circle className="h-4 w-4" />
                    Pending ({tasksByStatus.pending.length})
                  </h3>
                  <div className="space-y-2">
                    {tasksByStatus.pending.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isSelected={selectedTasks.includes(task.id)}
                        onToggleSelect={() => {
                          setSelectedTasks(prev =>
                            prev.includes(task.id)
                              ? prev.filter(id => id !== task.id)
                              : [...prev, task.id]
                          )
                        }}
                        onToggleStatus={handleToggleStatus}
                        onEdit={openEditDialog}
                        onDelete={handleDeleteTask}
                        prospects={prospects}
                        brandColors={brandColors}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* In Progress Tasks */}
              {tasksByStatus.in_progress.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    In Progress ({tasksByStatus.in_progress.length})
                  </h3>
                  <div className="space-y-2">
                    {tasksByStatus.in_progress.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isSelected={selectedTasks.includes(task.id)}
                        onToggleSelect={() => {
                          setSelectedTasks(prev =>
                            prev.includes(task.id)
                              ? prev.filter(id => id !== task.id)
                              : [...prev, task.id]
                          )
                        }}
                        onToggleStatus={handleToggleStatus}
                        onEdit={openEditDialog}
                        onDelete={handleDeleteTask}
                        prospects={prospects}
                        brandColors={brandColors}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Tasks */}
              {tasksByStatus.completed.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Completed ({tasksByStatus.completed.length})
                  </h3>
                  <div className="space-y-2">
                    {tasksByStatus.completed.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isSelected={selectedTasks.includes(task.id)}
                        onToggleSelect={() => {
                          setSelectedTasks(prev =>
                            prev.includes(task.id)
                              ? prev.filter(id => id !== task.id)
                              : [...prev, task.id]
                          )
                        }}
                        onToggleStatus={handleToggleStatus}
                        onEdit={openEditDialog}
                        onDelete={handleDeleteTask}
                        prospects={prospects}
                        brandColors={brandColors}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create/Edit Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium block mb-2">Title *</label>
              <Input
                placeholder="Task title..."
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Description</label>
              <Textarea
                placeholder="Task details..."
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">Priority</label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Status</label>
                <Select
                  value={taskForm.status}
                  onValueChange={(value) => setTaskForm({ ...taskForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">Due Date</label>
                <Input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Linked Prospect</label>
                <Select
                  value={taskForm.prospect_id || 'none'}
                  onValueChange={(value) => setTaskForm({ ...taskForm, prospect_id: value === 'none' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {prospects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sync Integration */}
            {!editingTask && (
              <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="schedule_sync"
                    checked={taskForm.schedule_sync_event}
                    onCheckedChange={(checked) => setTaskForm({ ...taskForm, schedule_sync_event: checked })}
                  />
                  <label htmlFor="schedule_sync" className="text-sm font-medium flex items-center gap-2">
                    <CalendarPlus className="h-4 w-4" style={{ color: brandColors.primary }} />
                    Schedule in Sync Calendar
                  </label>
                </div>
                
                {taskForm.schedule_sync_event && (
                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">Event Duration (minutes)</label>
                    <Input
                      type="number"
                      min="15"
                      step="15"
                      value={taskForm.sync_event_duration}
                      onChange={(e) => setTaskForm({ ...taskForm, sync_event_duration: parseInt(e.target.value) })}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeTaskDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTask}
              disabled={isCreating || !taskForm.title.trim()}
              style={{ backgroundColor: brandColors.primary, color: 'white' }}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingTask ? 'Update Task' : 'Create Task'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Task Card Component
function TaskCard({ task, isSelected, onToggleSelect, onToggleStatus, onEdit, onDelete, prospects, brandColors }) {
  const priorityConfig = PRIORITY_CONFIG[task.priority || 'medium']
  const prospect = prospects.find(p => p.id === task.prospect_id)
  const dueDate = task.due_date ? new Date(task.due_date) : null
  const isOverdue = dueDate && isPast(dueDate) && task.status !== 'completed'

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      task.status === 'completed' && "opacity-60"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="mt-1"
          />
          
          <button
            onClick={() => onToggleStatus(task)}
            className="mt-1"
          >
            {task.status === 'completed' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className={cn(
                "font-medium",
                task.status === 'completed' && "line-through text-muted-foreground"
              )}>
                {task.title}
              </h4>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(task.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {task.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                variant="outline" 
                className={cn(priorityConfig.bg, priorityConfig.color, priorityConfig.border)}
              >
                {priorityConfig.label}
              </Badge>

              {dueDate && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "flex items-center gap-1",
                    isOverdue && "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400"
                  )}
                >
                  <Clock className="h-3 w-3" />
                  {isOverdue ? 'Overdue' : format(dueDate, 'MMM d')}
                </Badge>
              )}

              {prospect && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {prospect.name}
                </Badge>
              )}

              {task.status === 'in_progress' && (
                <Badge 
                  style={{ 
                    backgroundColor: brandColors.rgba.primary10,
                    color: brandColors.primary,
                    border: 'none'
                  }}
                >
                  In Progress
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
