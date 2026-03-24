// src/components/sync/PlaybooksPanel.jsx
// Growth Playbooks - One-click task templates that create multiple tasks across modules

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Plus,
  Sparkles,
  Users,
  Target,
  FileText,
  Globe,
  MessageSquare,
  Star,
  ChevronRight,
  Loader2,
  CheckCircle,
  Clock,
  Calendar,
  Search,
  Zap,
  ArrowRight,
  Building,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { format, addDays } from 'date-fns'
import { syncApi, portalApi } from '@/lib/sonor-api'
import { toast } from 'sonner'
import useAuthStore from '@/lib/auth-store'

// Icon map for playbook categories
const CATEGORY_ICONS = {
  leads: Users,
  seo: Globe,
  reputation: MessageSquare,
  onboarding: Star,
  content: FileText,
  general: Target,
}

// Colors for source types
const SOURCE_TYPE_COLORS = {
  crm_reminder: { bg: 'bg-violet-100 dark:bg-violet-500/20', text: 'text-violet-700 dark:text-violet-300', label: 'CRM' },
  seo_task: { bg: 'bg-teal-100 dark:bg-teal-500/20', text: 'text-teal-700 dark:text-teal-300', label: 'SEO' },
  project_task: { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300', label: 'Projects' },
  engage: { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300', label: 'Engage' },
  reputation: { bg: 'bg-rose-100 dark:bg-rose-500/20', text: 'text-rose-700 dark:text-rose-300', label: 'Reputation' },
}

// Priority colors
const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
}

// PlaybookCard component
function PlaybookCard({ playbook, onApply, isLoading }) {
  const CategoryIcon = CATEGORY_ICONS[playbook.category] || CATEGORY_ICONS.general
  const stepCount = playbook.steps?.length || 0
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-xl border bg-[var(--glass-bg)] hover:shadow-md transition-all group",
        playbook.is_system && "border-dashed"
      )}
    >
      <div className="flex items-start gap-3">
        <div 
          className="p-2.5 rounded-xl shrink-0"
          style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
        >
          <CategoryIcon 
            className="h-5 w-5" 
            style={{ color: 'var(--brand-primary)' }}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium truncate">{playbook.name}</h3>
            {playbook.is_system && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Template
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {playbook.description}
          </p>
          
          {/* Step preview */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {playbook.steps?.slice(0, 4).map((step, i) => {
              const typeInfo = SOURCE_TYPE_COLORS[step.source_type] || SOURCE_TYPE_COLORS.project_task
              return (
                <Badge 
                  key={i} 
                  variant="secondary" 
                  className={cn("text-[10px]", typeInfo.bg, typeInfo.text)}
                >
                  {typeInfo.label}
                </Badge>
              )
            })}
            {stepCount > 4 && (
              <Badge variant="secondary" className="text-[10px]">
                +{stepCount - 4} more
              </Badge>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {stepCount} tasks
              </span>
              {playbook.use_count > 0 && (
                <span className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Used {playbook.use_count}×
                </span>
              )}
            </div>
            
            <Button
              size="sm"
              onClick={() => onApply(playbook)}
              disabled={isLoading}
              className="h-8 gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              Apply
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Step preview in apply dialog
function StepPreview({ step, index, startDate }) {
  const typeInfo = SOURCE_TYPE_COLORS[step.source_type] || SOURCE_TYPE_COLORS.project_task
  const dueDate = addDays(new Date(startDate), step.due_offset_days || 0)
  
  return (
    <div className="flex items-start gap-3 py-2">
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0",
        typeInfo.bg, typeInfo.text
      )}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-sm truncate">{step.title}</span>
          <Badge className={cn("text-[10px]", PRIORITY_COLORS[step.priority])}>
            {step.priority}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            {typeInfo.label}
          </Badge>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Due {format(dueDate, 'MMM d')}
          </span>
          {step.due_offset_days > 0 && (
            <span className="text-muted-foreground/60">
              (+{step.due_offset_days} days)
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Apply Playbook Dialog
function ApplyPlaybookDialog({ 
  open, 
  onOpenChange, 
  playbook, 
  projects = [],
  contacts = [],
  onApply 
}) {
  const [projectId, setProjectId] = useState('')
  const [contactId, setContactId] = useState('')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [isApplying, setIsApplying] = useState(false)
  
  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setProjectId('')
      setContactId('')
      setStartDate(format(new Date(), 'yyyy-MM-dd'))
    }
  }, [open])
  
  const handleApply = async () => {
    if (!projectId) {
      toast.error('Please select a project')
      return
    }
    
    setIsApplying(true)
    try {
      await onApply({
        project_id: projectId,
        contact_id: contactId || undefined,
        start_date: startDate,
      })
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to apply playbook:', err)
    } finally {
      setIsApplying(false)
    }
  }
  
  if (!playbook) return null
  
  const hasCrmSteps = playbook.steps?.some(s => s.source_type === 'crm_reminder')
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
            Apply Playbook
          </DialogTitle>
          <DialogDescription>
            Create {playbook.steps?.length || 0} tasks from "{playbook.name}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Project selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Project *</label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {p.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Contact selector (only if playbook has CRM steps) */}
          {hasCrmSteps && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Link to Contact
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a contact..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No contact</SelectItem>
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {c.name || c.email}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                CRM tasks will be linked to this contact
              </p>
            </div>
          )}
          
          {/* Start date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
            <p className="text-xs text-muted-foreground">
              Task due dates will be calculated from this date
            </p>
          </div>
          
          {/* Steps preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tasks to Create</label>
            <ScrollArea className="h-48 border rounded-lg p-3">
              <div className="space-y-1 divide-y">
                {playbook.steps?.map((step, i) => (
                  <StepPreview 
                    key={i} 
                    step={step} 
                    index={i} 
                    startDate={startDate}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleApply} 
            disabled={!projectId || isApplying}
            className="gap-2"
          >
            {isApplying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Create {playbook.steps?.length || 0} Tasks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Main PlaybooksPanel component
export default function PlaybooksPanel({ 
  className,
  onTasksCreated,
}) {
  const { currentProject, projects } = useAuthStore()
  const [playbooks, setPlaybooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlaybook, setSelectedPlaybook] = useState(null)
  const [applyDialogOpen, setApplyDialogOpen] = useState(false)
  const [contacts, setContacts] = useState([])
  
  // Fetch playbooks
  const fetchPlaybooks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await syncApi.getPlaybooks()
      setPlaybooks(response.playbooks || [])
    } catch (err) {
      console.error('Failed to fetch playbooks:', err)
      setError('Failed to load playbooks')
    } finally {
      setLoading(false)
    }
  }, [])
  
  // Fetch contacts for CRM task linking
  const fetchContacts = useCallback(async () => {
    if (!currentProject?.id) return
    try {
      const response = await portalApi.get(`/crm/prospects?project_id=${currentProject.id}&limit=50`)
      setContacts(response.data?.prospects || [])
    } catch (err) {
      console.error('Failed to fetch contacts:', err)
    }
  }, [currentProject?.id])
  
  useEffect(() => {
    fetchPlaybooks()
  }, [fetchPlaybooks])
  
  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])
  
  // Handle apply playbook
  const handleApplyPlaybook = async (dto) => {
    if (!selectedPlaybook) return
    
    try {
      const result = await syncApi.applyPlaybook(selectedPlaybook.id, dto)
      
      if (result.status === 'completed') {
        toast.success(`Created ${result.tasks_created} tasks!`, {
          description: `${selectedPlaybook.name} applied successfully`,
        })
      } else if (result.status === 'partial') {
        toast.warning(`Created ${result.tasks_created} tasks with some errors`, {
          description: 'Some tasks may not have been created',
        })
      } else {
        throw new Error('Failed to create tasks')
      }
      
      // Callback to refresh task list
      onTasksCreated?.()
      
      // Refresh playbooks to update use count
      fetchPlaybooks()
    } catch (err) {
      console.error('Failed to apply playbook:', err)
      toast.error('Failed to apply playbook')
      throw err
    }
  }
  
  // Filter playbooks by search
  const filteredPlaybooks = playbooks.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // Group by category
  const groupedPlaybooks = filteredPlaybooks.reduce((acc, p) => {
    const category = p.category || 'general'
    if (!acc[category]) acc[category] = []
    acc[category].push(p)
    return acc
  }, {})
  
  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  
  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <p className="text-sm text-muted-foreground mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchPlaybooks}>
          Try Again
        </Button>
      </div>
    )
  }
  
  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
          >
            <Zap className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div>
            <h3 className="font-semibold">Growth Playbooks</h3>
            <p className="text-xs text-muted-foreground">One-click task templates</p>
          </div>
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" disabled>
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Custom playbooks coming soon</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search playbooks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      
      {/* Playbook list */}
      <ScrollArea className="flex-1">
        <div className="space-y-6">
          {Object.keys(groupedPlaybooks).length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No playbooks match your search' : 'No playbooks available'}
              </p>
            </div>
          ) : (
            Object.entries(groupedPlaybooks).map(([category, categoryPlaybooks]) => {
              const CategoryIcon = CATEGORY_ICONS[category] || CATEGORY_ICONS.general
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium capitalize">{category}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {categoryPlaybooks.length}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {categoryPlaybooks.map(playbook => (
                      <PlaybookCard
                        key={playbook.id}
                        playbook={playbook}
                        onApply={(p) => {
                          setSelectedPlaybook(p)
                          setApplyDialogOpen(true)
                        }}
                      />
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
      
      {/* Apply dialog */}
      <ApplyPlaybookDialog
        open={applyDialogOpen}
        onOpenChange={setApplyDialogOpen}
        playbook={selectedPlaybook}
        projects={projects || []}
        contacts={contacts}
        onApply={handleApplyPlaybook}
      />
    </div>
  )
}
