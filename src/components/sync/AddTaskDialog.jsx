// src/components/sync/AddTaskDialog.jsx
// Unified task creation dialog - create tasks from Sync command center

import React, { useState, useEffect } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  CalendarIcon,
  ClipboardList,
  Briefcase,
  Users,
  Search,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { syncApi, projectsApi, crmApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'
import { toast } from 'sonner'

// Task type configurations
const TASK_TYPES = [
  { 
    value: 'project_task', 
    label: 'Project Task', 
    icon: ClipboardList,
    description: 'General project work item'
  },
  { 
    value: 'uptrade_task', 
    label: 'Sonor Task', 
    icon: Briefcase,
    description: 'Internal Sonor team task'
  },
  { 
    value: 'crm_reminder', 
    label: 'CRM Reminder', 
    icon: Users,
    description: 'Follow-up reminder for a contact'
  },
  { 
    value: 'seo_task', 
    label: 'SEO Task', 
    icon: Search,
    description: 'SEO optimization task'
  },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const CRM_REMINDER_TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'follow_up', label: 'Follow Up' },
]

export default function AddTaskDialog({ 
  open, 
  onOpenChange, 
  projectId: defaultProjectId,
  onTaskCreated 
}) {
  const { user, org } = useAuthStore()
  
  // Form state
  const [sourceType, setSourceType] = useState('project_task')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState(defaultProjectId || '')
  const [dueDate, setDueDate] = useState(null)
  const [priority, setPriority] = useState('normal')
  const [assignedTo, setAssignedTo] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  
  // CRM-specific
  const [prospectId, setProspectId] = useState('')
  const [reminderType, setReminderType] = useState('follow_up')
  
  // Data for dropdowns
  const [projects, setProjects] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [prospects, setProspects] = useState([])
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Load projects and team members on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // Load projects
        const projRes = await projectsApi.listProjects()
        setProjects(projRes?.data?.projects || projRes?.projects || [])
        
        // Load team members
        const teamRes = await syncApi.getTeamMembers()
        setTeamMembers(teamRes?.data?.members || teamRes?.members || [])
      } catch (err) {
        console.error('Failed to load dialog data:', err)
      } finally {
        setLoading(false)
      }
    }
    
    if (open) {
      loadData()
    }
  }, [open])

  // Load prospects when CRM reminder is selected
  useEffect(() => {
    const loadProspects = async () => {
      if (sourceType === 'crm_reminder' && projectId) {
        try {
          const res = await crmApi.getProspects({ project_id: projectId, limit: 100 })
          setProspects(res?.data?.prospects || res?.prospects || [])
        } catch (err) {
          console.error('Failed to load prospects:', err)
        }
      }
    }
    loadProspects()
  }, [sourceType, projectId])

  // Update projectId when defaultProjectId changes
  useEffect(() => {
    if (defaultProjectId) {
      setProjectId(defaultProjectId)
    }
  }, [defaultProjectId])

  const resetForm = () => {
    setSourceType('project_task')
    setTitle('')
    setDescription('')
    setProjectId(defaultProjectId || '')
    setDueDate(null)
    setPriority('normal')
    setAssignedTo('')
    setEstimatedHours('')
    setProspectId('')
    setReminderType('follow_up')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!projectId) {
      setError('Please select a project')
      return
    }
    if (sourceType === 'crm_reminder' && !prospectId) {
      setError('Please select a contact for CRM reminders')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        source_type: sourceType,
        title: title.trim(),
        description: description.trim() || undefined,
        project_id: projectId,
        due_date: dueDate ? dueDate.toISOString() : undefined,
        priority,
        assigned_to: assignedTo || undefined,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
      }

      // Add type-specific fields
      if (sourceType === 'crm_reminder') {
        payload.prospect_id = prospectId
        payload.reminder_type = reminderType
      }

      const response = await syncApi.createUnifiedTask(payload)
      
      toast.success('Task created successfully')
      onTaskCreated?.(response?.data?.task || response?.task)
      handleClose()
    } catch (err) {
      console.error('Failed to create task:', err)
      const msg = err?.response?.data?.message || err?.message || 'Failed to create task'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedType = TASK_TYPES.find(t => t.value === sourceType)
  const TypeIcon = selectedType?.icon || ClipboardList

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
            >
              <TypeIcon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
            </div>
            Add Task
          </DialogTitle>
          <DialogDescription>
            Create a new task from the Sync command center
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Task Type Selector */}
          <div className="grid gap-2">
            <Label htmlFor="source_type">Task Type</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger id="source_type">
                <SelectValue placeholder="Select task type" />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((type) => {
                  const Icon = type.icon
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{selectedType?.description}</p>
          </div>

          {/* Project Selector */}
          <div className="grid gap-2">
            <Label htmlFor="project_id">Project *</Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={loading}>
              <SelectTrigger id="project_id">
                <SelectValue placeholder={loading ? "Loading..." : "Select project"} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add more details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* CRM-specific: Contact selector */}
          {sourceType === 'crm_reminder' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="prospect_id">Contact *</Label>
                <Select value={prospectId} onValueChange={setProspectId}>
                  <SelectTrigger id="prospect_id">
                    <SelectValue placeholder="Select contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {prospects.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No contacts found
                      </SelectItem>
                    ) : (
                      prospects.map((prospect) => (
                        <SelectItem key={prospect.id} value={prospect.id}>
                          {prospect.name || prospect.email || prospect.company}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="reminder_type">Reminder Type</Label>
                <Select value={reminderType} onValueChange={setReminderType}>
                  <SelectTrigger id="reminder_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRM_REMINDER_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Two-column row: Due Date + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee */}
          <div className="grid gap-2">
            <Label htmlFor="assigned_to">Assign To</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger id="assigned_to">
                <SelectValue placeholder="Assign to someone (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Myself</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.user_id || member.id} value={member.user_id || member.id}>
                    {member.name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estimated Hours (optional) */}
          <div className="grid gap-2">
            <Label htmlFor="estimated_hours">Estimated Hours</Label>
            <Input
              id="estimated_hours"
              type="number"
              min="0"
              step="0.5"
              placeholder="e.g., 2.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !title.trim() || !projectId}>
            {submitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Task'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
