// src/components/sync/TeamTasksPanel.jsx
// Team View - Manager sees team members' tasks and capacity

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Target,
  Calendar,
  User,
  BarChart3,
  Filter,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { syncApi } from '@/lib/portal-api'
import { toast } from 'sonner'

// ============================================================================
// CAPACITY INDICATOR
// ============================================================================

function CapacityIndicator({ capacity }) {
  if (!capacity) return null
  
  const { capacity_percentage, is_overloaded, active_tasks, estimated_hours } = capacity
  
  const getCapacityColor = (pct) => {
    if (pct > 100) return 'bg-red-500'
    if (pct > 80) return 'bg-amber-500'
    return 'bg-emerald-500'
  }
  
  return (
    <div className="flex items-center gap-2">
      <Progress 
        value={Math.min(capacity_percentage, 100)} 
        className="h-2 w-20"
        indicatorClassName={getCapacityColor(capacity_percentage)}
      />
      <span className={cn(
        "text-xs font-medium",
        is_overloaded && "text-red-600 dark:text-red-400"
      )}>
        {capacity_percentage}%
      </span>
      {is_overloaded && (
        <TrendingUp className="h-3.5 w-3.5 text-red-500" />
      )}
    </div>
  )
}

// ============================================================================
// TEAM MEMBER CARD
// ============================================================================

function TeamMemberCard({ member, onViewTasks, isExpanded, onToggle }) {
  const { name, email, avatar, role, task_counts, capacity, tasks } = member
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase() || email?.[0]?.toUpperCase() || '?'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-xl bg-[var(--glass-bg)] overflow-hidden"
    >
      {/* Header */}
      <div 
        className="p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}>
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{name}</span>
            <Badge variant="outline" className="text-[10px]">{role}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              {task_counts.total} tasks
            </span>
            {task_counts.overdue > 0 && (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-3 w-3" />
                {task_counts.overdue} overdue
              </span>
            )}
            {task_counts.today > 0 && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {task_counts.today} today
              </span>
            )}
          </div>
        </div>
        
        <CapacityIndicator capacity={capacity} />
        
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      
      {/* Expanded Task List */}
      <AnimatePresence>
        {isExpanded && tasks && tasks.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t"
          >
            <div className="p-3 space-y-2 bg-muted/30">
              {tasks.slice(0, 10).map((task) => (
                <TaskRow key={task.task_id} task={task} />
              ))}
              {tasks.length > 10 && (
                <button
                  onClick={() => onViewTasks(member)}
                  className="w-full text-center py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  View all {tasks.length} tasks →
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================================================
// TASK ROW (Compact for team view)
// ============================================================================

function TaskRow({ task }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date()
  
  const formatDueDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === date.toDateString()
    
    if (isToday) return 'Today'
    if (isTomorrow) return 'Tomorrow'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  
  const getSourceBadge = (source) => {
    const configs = {
      project_task: { label: 'Project', color: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300' },
      uptrade_task: { label: 'Sonor', color: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' },
      crm_reminder: { label: 'CRM', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
      unanswered_email: { label: 'Email', color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' },
    }
    return configs[source] || { label: 'Task', color: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300' }
  }
  
  const sourceBadge = getSourceBadge(task.task_source)
  
  return (
    <div className={cn(
      "flex items-center gap-3 p-2 rounded-lg bg-[var(--glass-bg)] border text-sm",
      isOverdue && "border-red-300 dark:border-red-500/30"
    )}>
      <CheckCircle className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="flex-1 truncate">{task.title}</span>
      <Badge variant="outline" className={cn("text-[10px] h-5", sourceBadge.color)}>
        {sourceBadge.label}
      </Badge>
      {task.due_date && (
        <span className={cn(
          "text-xs",
          isOverdue ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"
        )}>
          {formatDueDate(task.due_date)}
        </span>
      )}
    </div>
  )
}

// ============================================================================
// SUMMARY STATS
// ============================================================================

function SummaryStats({ summary }) {
  if (!summary) return null
  
  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      <div className="p-3 rounded-xl bg-muted/50 border">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Team</span>
        </div>
        <span className="text-xl font-bold">{summary.total_team_members || 0}</span>
      </div>
      <div className="p-3 rounded-xl" style={{ 
        backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)',
        borderWidth: 1,
        borderColor: 'color-mix(in srgb, var(--brand-primary) 30%, transparent)'
      }}>
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
          <span className="text-xs" style={{ color: 'var(--brand-primary)' }}>Tasks</span>
        </div>
        <span className="text-xl font-bold" style={{ color: 'var(--brand-primary)' }}>
          {summary.total_tasks || 0}
        </span>
      </div>
      <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-xs text-red-700 dark:text-red-400">Overdue</span>
        </div>
        <span className="text-xl font-bold text-red-700 dark:text-red-400">
          {summary.total_overdue || 0}
        </span>
      </div>
      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs text-amber-700 dark:text-amber-400">Overloaded</span>
        </div>
        <span className="text-xl font-bold text-amber-700 dark:text-amber-400">
          {summary.capacity_alerts?.length || 0}
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// CAPACITY ALERTS
// ============================================================================

function CapacityAlerts({ alerts }) {
  if (!alerts || alerts.length === 0) return null
  
  return (
    <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="font-medium text-sm text-amber-700 dark:text-amber-400">
          Capacity Alerts
        </span>
      </div>
      <div className="space-y-1">
        {alerts.map((alert) => (
          <div key={alert.member_id} className="text-sm text-amber-800 dark:text-amber-300">
            <span className="font-medium">{alert.name}</span>
            {' is at '}
            <span className="font-bold">{alert.overload_percentage}%</span>
            {' capacity'}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TeamTasksPanel({ projectId, className, onMemberClick }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [expandedMemberId, setExpandedMemberId] = useState(null)
  const [filterAssignee, setFilterAssignee] = useState('all')

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const result = await syncApi.getTeamTasks(projectId)
      setData(result.data || result)
    } catch (err) {
      console.error('Failed to load team tasks:', err)
      setError(err.message || 'Failed to load team tasks')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [projectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const handleToggleMember = (memberId) => {
    setExpandedMemberId(expandedMemberId === memberId ? null : memberId)
  }

  const handleViewMemberTasks = (member) => {
    onMemberClick?.(member)
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
      <div className={cn("flex flex-col items-center justify-center py-12 gap-3", className)}>
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          Try Again
        </Button>
      </div>
    )
  }

  if (!data || !data.members || data.members.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 gap-3", className)}>
        <Users className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No team members to manage</p>
        <p className="text-xs text-muted-foreground">
          You can manage team members with a lower hierarchy level than you
        </p>
      </div>
    )
  }

  const { members, summary } = data

  // Filter members if needed
  const filteredMembers = filterAssignee === 'all'
    ? members
    : members.filter(m => m.member_id === filterAssignee)

  return (
    <div className={cn("p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
            Team Tasks
          </h2>
          <p className="text-sm text-muted-foreground">
            {summary.total_team_members} team members · {summary.total_tasks} tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-[160px] h-8">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="All members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All members</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.member_id} value={member.member_id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <SummaryStats summary={summary} />

      {/* Capacity Alerts */}
      <CapacityAlerts alerts={summary.capacity_alerts} />

      {/* Team Members */}
      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="space-y-3">
          {filteredMembers.map((member) => (
            <TeamMemberCard
              key={member.member_id}
              member={member}
              isExpanded={expandedMemberId === member.member_id}
              onToggle={() => handleToggleMember(member.member_id)}
              onViewTasks={handleViewMemberTasks}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
