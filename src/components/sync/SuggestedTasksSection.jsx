// src/components/sync/SuggestedTasksSection.jsx
// "Signal Suggests" - CRM follow-ups, daily briefing priorities, and other AI suggestions
// Users can "Add to my tasks" to create real tasks from suggestions

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Users,
  Plus,
  X,
  RefreshCw,
  ChevronDown,
  Clock,
  AlertCircle,
  Target,
  Briefcase,
  TrendingUp,
  ClipboardList,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { crmSkillsApi, seoSkillsApi, syncApi as signalSyncApi } from '@/lib/signal-api'
import { syncApi } from '@/lib/portal-api'
import { toast } from 'sonner'
import SignalIcon from '@/components/ui/SignalIcon'
import { useSignalAccess } from '@/lib/signal-access'

// Local storage keys
const DISMISSED_KEY = 'sync_dismissed_suggestions'
const CACHE_KEY_PREFIX = 'sync_signal_suggestions_'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

// Get cached suggestions for a project
const getCachedSuggestions = (projectId) => {
  try {
    const key = CACHE_KEY_PREFIX + (projectId || 'global')
    const stored = localStorage.getItem(key)
    if (!stored) return null
    const { data, timestamp } = JSON.parse(stored)
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(key)
      return null
    }
    return data
  } catch {
    return null
  }
}

// Save suggestions to cache
const setCachedSuggestions = (projectId, data) => {
  try {
    const key = CACHE_KEY_PREFIX + (projectId || 'global')
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // Ignore storage errors
  }
}

// Invalidate cache for a project (called after adding/dismissing)
const invalidateCache = (projectId) => {
  try {
    localStorage.removeItem(CACHE_KEY_PREFIX + (projectId || 'global'))
  } catch {
    // Ignore
  }
}

// Get dismissed IDs from localStorage
const getDismissed = () => {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY)
    if (!stored) return new Set()
    const { ids, timestamp } = JSON.parse(stored)
    // Clear dismissed after 24 hours
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(DISMISSED_KEY)
      return new Set()
    }
    return new Set(ids)
  } catch {
    return new Set()
  }
}

// Save dismissed ID
const addDismissed = (id) => {
  try {
    const current = getDismissed()
    current.add(id)
    localStorage.setItem(DISMISSED_KEY, JSON.stringify({
      ids: Array.from(current),
      timestamp: Date.now(),
    }))
  } catch {
    // Ignore storage errors
  }
}

// Suggestion card component - expands on hover to show full text
function SuggestionCard({ suggestion, onAdd, onDismiss, isAdding }) {
  const [expanded, setExpanded] = useState(false)
  const getSourceConfig = (source) => {
    switch (source) {
      case 'crm':
        return { icon: Users, label: 'CRM', color: 'amber' }
      case 'briefing':
        return { icon: Target, label: 'Today', color: 'teal' }
      case 'sales':
        return { icon: TrendingUp, label: 'Sales', color: 'emerald' }
      case 'project':
        return { icon: ClipboardList, label: 'Project', color: 'violet' }
      case 'seo':
        return { icon: Search, label: 'SEO', color: 'blue' }
      default:
        return { icon: Sparkles, label: 'Signal', color: 'gray' }
    }
  }

  const source = getSourceConfig(suggestion.source)
  const SourceIcon = source.icon

  const formatDeadline = (deadline) => {
    if (!deadline) return null
    const date = new Date(deadline)
    const now = new Date()
    const diff = date - now
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    
    if (days < 0) return { text: 'Overdue', urgent: true }
    if (days === 0) return { text: 'Today', urgent: true }
    if (days === 1) return { text: 'Tomorrow', urgent: false }
    if (days <= 7) return { text: `${days} days`, urgent: false }
    return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), urgent: false }
  }

  const deadline = formatDeadline(suggestion.deadline || suggestion.suggestedSlot)
  const urgency = suggestion.urgency

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn(
        "p-3 rounded-lg border bg-card hover:shadow-sm transition-all group cursor-default",
        urgency === 'critical' && "border-red-300 dark:border-red-500/30",
        urgency === 'high' && "border-amber-300 dark:border-amber-500/30"
      )}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="flex items-start gap-2">
        {/* Icon */}
        <div 
          className="p-1.5 rounded-lg shrink-0"
          style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
        >
          <SourceIcon className="h-3.5 w-3.5" style={{ color: 'var(--brand-primary)' }} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className={cn(
              "font-medium text-sm",
              !expanded && "truncate max-w-[140px]"
            )}>
              {suggestion.title || suggestion.name || suggestion.action}
            </span>
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 shrink-0">
              {source.label}
            </Badge>
            {urgency && urgency !== 'medium' && urgency !== 'low' && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[9px] h-4 px-1.5 shrink-0",
                  urgency === 'critical' && "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400",
                  urgency === 'high' && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400"
                )}
              >
                {urgency === 'critical' ? '!' : 'High'}
              </Badge>
            )}
          </div>
          {/* Deadline on separate line for space */}
          {deadline && (
            <div className={cn(
              "text-xs mb-0.5",
              deadline.urgent ? "text-red-600" : "text-muted-foreground"
            )}>
              <Clock className="h-3 w-3 inline mr-0.5" />
              {deadline.text}
            </div>
          )}

          {/* Reason - expands on hover to show full text */}
          {suggestion.reason && (
            <p className={cn(
              "text-xs text-muted-foreground mb-1 transition-all duration-200",
              !expanded && "line-clamp-2"
            )}>
              {suggestion.reason}
            </p>
          )}
        </div>

        {/* Actions - stacked vertically for space */}
        <div className="flex flex-col items-center gap-1 shrink-0 ml-1">
          <Button
            size="icon"
            className="h-7 w-7"
            style={{ backgroundColor: 'var(--brand-primary)' }}
            onClick={() => onAdd(suggestion)}
            disabled={isAdding}
          >
            {isAdding ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => onDismiss(suggestion)}
            disabled={isAdding}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// Main component
export default function SuggestedTasksSection({ 
  projectId, 
  onTaskCreated,
  className 
}) {
  const { hasAccess: hasSignalAccess, hasCurrentProjectSignal } = useSignalAccess()
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isOpen, setIsOpen] = useState(true)
  const [addingId, setAddingId] = useState(null)

  // Signal requires project plan access
  const signalEnabled = hasCurrentProjectSignal

  // Force refresh bypasses cache
  const loadSuggestions = useCallback(async (forceRefresh = false) => {
    // Don't fetch if Signal is not enabled for this project
    if (!signalEnabled) {
      setSuggestions([])
      setLoading(false)
      return
    }

    try {
      setError(null)

      const dismissed = getDismissed()

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = getCachedSuggestions(projectId)
        if (cached) {
          // Filter out any newly dismissed items from cached data
          const filtered = cached.filter(s => !dismissed.has(s.id))
          setSuggestions(filtered)
          setLoading(false)
          return
        }
      }

      setLoading(true)

      const allSuggestions = []

      // Fetch CRM follow-ups, daily briefing, and SEO opportunities in parallel
      // Pass projectId to scope results to the current project context
      const [crmResult, briefingResult, seoResult] = await Promise.allSettled([
        crmSkillsApi.prioritizeFollowups(10, projectId),
        signalSyncApi.getDailyBriefing({ focusAreas: ['sales', 'project', 'meeting-prep'], projectId }),
        projectId ? seoSkillsApi.getOpportunities(projectId, { limit: 5 }) : Promise.resolve(null),
      ])

      // Process CRM suggestions
      if (crmResult.status === 'fulfilled' && crmResult.value?.prioritized_prospects) {
        const crmSuggestions = crmResult.value.prioritized_prospects
          .map(s => ({
            ...s,
            id: `crm-${s.id}`,
            originalId: s.id,
            source: 'crm',
            title: s.name,
          }))
        allSuggestions.push(...crmSuggestions)
      }

      // Process SEO opportunities
      if (seoResult.status === 'fulfilled' && seoResult.value?.data?.opportunities) {
        const seoOpportunities = seoResult.value.data.opportunities
          .map(o => ({
            id: `seo-${o.id}`,
            originalId: o.id,
            source: 'seo',
            title: o.title,
            reason: o.description,
            suggested_action: o.action_required,
            urgency: o.priority === 'critical' ? 'critical' : o.priority === 'high' ? 'high' : 'medium',
            seoType: o.type,
            seoData: o.data,
            estimatedImpact: o.estimated_impact,
          }))
        allSuggestions.push(...seoOpportunities)
      }

      // Process daily briefing priorities
      if (briefingResult.status === 'fulfilled' && briefingResult.value?.data?.priorities) {
        const priorities = briefingResult.value.data.priorities
          .slice(0, 5) // Limit to top 5 priorities
          .map(p => ({
            id: `briefing-${p.rank}`,
            source: p.type === 'sales' ? 'sales' : p.type === 'meeting-prep' ? 'meeting-prep' : 'briefing',
            title: p.action,
            action: p.action,
            reason: p.reason,
            timeEstimate: p.timeEstimate,
            suggestedSlot: p.suggestedSlot,
            urgency: p.urgency,
            type: p.type,
            rank: p.rank,
          }))
        allSuggestions.push(...priorities)
      }

      // Sort by urgency: critical > high > medium > low
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      allSuggestions.sort((a, b) => {
        const aOrder = urgencyOrder[a.urgency] ?? 2
        const bOrder = urgencyOrder[b.urgency] ?? 2
        return aOrder - bOrder
      })

      // Cache the full set (before dismiss filtering) so dismissed state is applied at read time
      setCachedSuggestions(projectId, allSuggestions)

      // Apply dismiss filter for display
      const filtered = allSuggestions.filter(s => !dismissed.has(s.id))
      setSuggestions(filtered)
    } catch (err) {
      console.error('Failed to load suggestions:', err)
      // Don't show error for empty results or auth issues
      if (err?.response?.status !== 401 && err?.response?.status !== 403) {
        setError('Failed to load suggestions')
      }
    } finally {
      setLoading(false)
    }
  }, [projectId, signalEnabled])

  useEffect(() => {
    loadSuggestions()
  }, [loadSuggestions])

  // Don't render the section at all if Signal is not enabled
  if (!signalEnabled) return null

  const handleAdd = async (suggestion) => {
    setAddingId(suggestion.id)
    
    try {
      let payload

      if (suggestion.source === 'crm') {
        // CRM follow-up suggestion
        payload = {
          source_type: 'crm_reminder',
          title: `Follow up with ${suggestion.name || suggestion.title}`,
          description: suggestion.reason || suggestion.suggested_action,
          project_id: projectId,
          prospect_id: suggestion.originalId,
          reminder_type: mapActionToReminderType(suggestion.suggested_action),
          priority: suggestion.priority > 7 ? 'high' : suggestion.priority > 4 ? 'normal' : 'low',
          due_date: suggestion.deadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }
      } else if (suggestion.source === 'seo') {
        // SEO opportunity suggestion
        const priorityMap = { critical: 'urgent', high: 'high', medium: 'normal', low: 'low' }
        
        payload = {
          source_type: 'seo_task',
          title: suggestion.title,
          description: `${suggestion.reason || ''}\n\nAction Required: ${suggestion.suggested_action || 'Review and take action'}`,
          project_id: projectId,
          priority: priorityMap[suggestion.urgency] || 'normal',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default 1 week
          metadata: {
            from_signal_seo: true,
            seo_type: suggestion.seoType,
            seo_data: suggestion.seoData,
            estimated_impact: suggestion.estimatedImpact,
          },
        }
      } else {
        // Daily briefing priority (sales, project, meeting-prep, briefing)
        const priorityMap = { critical: 'urgent', high: 'high', medium: 'normal', low: 'low' }
        const sourceTypeMap = {
          sales: 'uptrade_task',
          project: 'project_task',
          'meeting-prep': 'calendar_task',
          briefing: 'uptrade_task',
        }

        payload = {
          source_type: sourceTypeMap[suggestion.source] || 'uptrade_task',
          title: suggestion.title || suggestion.action,
          description: suggestion.reason || '',
          project_id: projectId,
          priority: priorityMap[suggestion.urgency] || 'normal',
          due_date: suggestion.suggestedSlot || new Date().toISOString(),
          metadata: {
            from_briefing: true,
            rank: suggestion.rank,
            time_estimate: suggestion.timeEstimate,
            original_type: suggestion.type,
          },
        }
      }

      await syncApi.createUnifiedTask(payload)
      
      // Remove from suggestions list
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))
      
      const taskTitle = suggestion.source === 'crm' 
        ? `Follow up with ${suggestion.name || suggestion.title}`
        : suggestion.title || suggestion.action
      
      toast.success(`Added task: ${taskTitle}`)
      onTaskCreated?.()
    } catch (err) {
      console.error('Failed to add suggestion as task:', err)
      toast.error('Failed to create task')
    } finally {
      setAddingId(null)
    }
  }

  const handleDismiss = (suggestion) => {
    addDismissed(suggestion.id)
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))
    toast.success('Suggestion dismissed')
  }

  // Don't render if no suggestions and not loading
  if (!loading && suggestions.length === 0 && !error) {
    return null
  }

  return (
    <div className={cn("mb-6", className)}>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 flex-1 text-left cursor-pointer"
        >
          <SignalIcon className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
          <span className="font-semibold text-sm">Signal Suggests</span>
          {suggestions.length > 0 && (
            <Badge 
              className="ml-1 h-5 text-xs"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {suggestions.length}
            </Badge>
          )}
          <ChevronDown className={cn(
            "h-4 w-4 ml-auto text-muted-foreground transition-transform",
            !isOpen && "-rotate-90"
          )} />
        </button>
        {!loading && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
            title="Re-analyze suggestions"
            onClick={(e) => {
              e.stopPropagation()
              loadSuggestions(true)
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="py-4 text-center">
                <AlertCircle className="h-5 w-5 text-amber-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => loadSuggestions(true)}
                >
                  Retry
                </Button>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                <Sparkles className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                No suggestions right now
              </div>
            ) : (
              <div className="space-y-2">
                {suggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onAdd={handleAdd}
                    onDismiss={handleDismiss}
                    isAdding={addingId === suggestion.id}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Helper to map suggested action text to reminder type
function mapActionToReminderType(action) {
  if (!action) return 'follow_up'
  const lower = action.toLowerCase()
  if (lower.includes('call')) return 'call'
  if (lower.includes('email')) return 'email'
  if (lower.includes('meeting') || lower.includes('schedule')) return 'meeting'
  return 'follow_up'
}
