/**
 * EmailAutomationsTab - Automated email sequences triggered by events
 * Extracted from EmailPlatform.jsx AutomationsTab for code splitting.
 *
 * Design system: Sonor Liquid Glass (GlassCard, StatTile, OutreachStatusBadge)
 * Store: useEmailPlatformStore (automations slice)
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card'
import { StatTile, StatTileGrid } from '@/components/ui/stat-tile'
import {
  OutreachStatusBadge,
  OutreachLoading,
  OutreachEmptyState,
} from '@/components/outreach/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Zap,
  Plus,
  Play,
  Pause,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Mail,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
} from 'lucide-react'
import { useEmailPlatformStore } from '@/lib/email-platform-store'
import useAuthStore from '@/lib/auth-store'
import { formsApi } from '@/lib/sonor-api'
import { automationTriggerLabels } from '@/components/email/utils/constants'

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDelay(delay) {
  if (!delay) return 'Immediately'
  const { value, unit } = typeof delay === 'object' ? delay : { value: delay, unit: 'hours' }
  if (!value) return 'Immediately'
  const u = unit === 'minutes' ? 'min' : unit === 'hours' ? 'hr' : unit === 'days' ? 'day' : unit
  return `${value} ${u}${value !== 1 ? 's' : ''}`
}

// ─── Automation Step Preview ──────────────────────────────────────────────

function StepPreview({ steps }) {
  const previewSteps = (steps || []).slice(0, 3)
  if (!previewSteps.length) return null

  return (
    <div className="mt-3 space-y-1.5 pl-4 border-l-2 border-[var(--glass-border)]">
      {previewSteps.map((step, i) => (
        <div
          key={step.id || i}
          className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
        >
          <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center text-[10px] font-semibold text-[var(--text-tertiary)]">
            {i + 1}
          </span>
          <Mail className="h-3 w-3 shrink-0 text-[var(--text-tertiary)]" />
          <span className="truncate font-medium text-[var(--text-primary)]">
            {step.subject || 'Untitled email'}
          </span>
          <span className="shrink-0 text-[var(--text-tertiary)]">
            &middot; {formatDelay(step.delay)}
          </span>
        </div>
      ))}
      {(steps || []).length > 3 && (
        <p className="text-[10px] text-[var(--text-tertiary)] pl-7">
          +{steps.length - 3} more step{steps.length - 3 !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

// ─── Automation Card ──────────────────────────────────────────────────────

function AutomationCard({
  automation,
  forms,
  onEdit,
  onDuplicate,
  onToggleStatus,
  expanded,
  onToggleExpand,
}) {
  const inProgress = (automation.total_enrolled || 0) - (automation.total_completed || 0)
  const hasNoSteps = !automation.steps?.length && !automation.steps_count

  // Build the trigger label using the forms list to resolve IDs
  const triggerLabel = useMemo(() => {
    const { trigger_type, trigger_config } = automation

    if (trigger_type === 'form_submitted' && trigger_config?.formId) {
      const form = forms.find((f) => f.id === trigger_config.formId)
      const formName = form?.name || 'Unknown form'
      return (
        <span className="flex items-center gap-1.5 flex-wrap">
          <span>When</span>
          <Badge variant="outline" className="font-normal text-xs">
            {formName}
          </Badge>
          <span>is submitted</span>
          {trigger_config.sendConfirmation && (
            <Badge variant="secondary" className="text-[10px] ml-1">
              <Mail className="h-3 w-3 mr-1" />
              Sends confirmation
            </Badge>
          )}
        </span>
      )
    }

    // Dynamic label for tag triggers
    if (trigger_type === 'tag_added' && trigger_config?.tagName) {
      return `When tag "${trigger_config.tagName}" is added`
    }
    if (trigger_type === 'tag_removed' && trigger_config?.tagName) {
      return `When tag "${trigger_config.tagName}" is removed`
    }
    if (trigger_type === 'date_based' && trigger_config?.dateField) {
      return `On ${trigger_config.dateField}`
    }

    return automationTriggerLabels[trigger_type] || trigger_type || 'Unknown trigger'
  }, [automation, forms])

  const statusKey =
    automation.status === 'active'
      ? 'active'
      : automation.status === 'draft'
        ? 'draft'
        : 'paused'

  return (
    <GlassCard className="hover:border-[var(--glass-border-strong)] transition-all duration-200">
      <GlassCardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={`p-3 rounded-xl shrink-0 ${
              automation.status === 'active'
                ? 'bg-emerald-500/10'
                : 'bg-[var(--glass-bg)]'
            }`}
          >
            <Zap
              className={`h-5 w-5 ${
                automation.status === 'active'
                  ? 'text-emerald-500'
                  : 'text-[var(--text-tertiary)]'
              }`}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Name + status row */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-[var(--text-primary)] truncate">
                {automation.name}
              </h3>
              <OutreachStatusBadge status={statusKey} />
              {hasNoSteps && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <AlertTriangle className="h-3 w-3" />
                  Incomplete — no email steps configured
                </span>
              )}
            </div>

            {/* Trigger */}
            <p className="text-sm text-[var(--text-secondary)]">{triggerLabel}</p>

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                {inProgress} in progress
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {automation.total_completed || 0} completed
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {automation.total_enrolled || 0} enrolled
              </span>
            </div>

            {/* Expandable step count */}
            <button
              onClick={onToggleExpand}
              className="flex items-center gap-1 mt-2 text-xs font-medium text-[var(--brand-primary)] hover:underline"
            >
              <Mail className="h-3 w-3" />
              {automation.steps_count || automation.steps?.length || 0} email
              {(automation.steps_count || automation.steps?.length || 0) !== 1 ? 's' : ''} in
              sequence
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>

            {/* Step preview (expanded) */}
            {expanded && <StepPreview steps={automation.steps} />}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleStatus(automation)}
              title={automation.status === 'active' ? 'Pause' : 'Resume'}
            >
              {automation.status === 'active' ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(automation)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(automation)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onToggleStatus(automation)}
                >
                  {automation.status === 'active' ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Resume
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-500 focus:text-red-500">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}

// ─── Main Tab ─────────────────────────────────────────────────────────────

export default function EmailAutomationsTab({ onEditAutomation, onNewAutomation }) {
  const {
    automations,
    automationsLoading,
    fetchAutomations,
    toggleAutomationStatus,
  } = useEmailPlatformStore()

  const [forms, setForms] = useState([])
  const [expandedIds, setExpandedIds] = useState(new Set())

  // Fetch automations + forms on mount
  useEffect(() => {
    fetchAutomations()

    const loadForms = async () => {
      try {
        const { currentProject } = useAuthStore.getState()
        if (!currentProject?.id) return
        const res = await formsApi.list({ projectId: currentProject.id })
        setForms(res.data?.forms || res.data || [])
      } catch (err) {
        console.error('Failed to fetch forms:', err)
      }
    }
    loadForms()
  }, [fetchAutomations])

  // ── Computed stats ────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const active = automations.filter((a) => a.status === 'active').length
    const totalEnrolled = automations.reduce((s, a) => s + (a.total_enrolled || 0), 0)
    const totalCompleted = automations.reduce((s, a) => s + (a.total_completed || 0), 0)
    const inProgress = totalEnrolled - totalCompleted

    return [
      {
        key: 'active',
        label: 'Active Automations',
        value: active,
        icon: Zap,
        color: 'green',
      },
      {
        key: 'in-progress',
        label: 'In Progress',
        value: inProgress,
        icon: Activity,
        color: 'blue',
      },
      {
        key: 'completed',
        label: 'Completed',
        value: totalCompleted,
        icon: CheckCircle2,
        color: 'purple',
      },
      {
        key: 'enrolled',
        label: 'Total Enrolled',
        value: totalEnrolled,
        icon: Users,
        color: 'orange',
      },
    ]
  }, [automations])

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleToggleStatus = useCallback(
    async (automation) => {
      const newStatus = automation.status === 'active' ? 'paused' : 'active'
      try {
        await toggleAutomationStatus(automation.id, newStatus)
        if (newStatus === 'paused') {
          toast('Automation paused', {
            action: {
              label: 'Undo',
              onClick: () => toggleAutomationStatus(automation.id, 'active'),
            },
          })
        } else {
          toast.success('Automation activated')
        }
      } catch {
        toast.error('Failed to update automation status')
      }
    },
    [toggleAutomationStatus],
  )

  const handleDuplicate = useCallback(
    (automation) => {
      if (onEditAutomation) {
        onEditAutomation({
          ...automation,
          id: null,
          name: `${automation.name} (Copy)`,
        })
      } else {
        toast('Duplicate not yet implemented')
      }
    },
    [onEditAutomation],
  )

  const handleEdit = useCallback(
    (automation) => {
      onEditAutomation?.(automation)
    },
    [onEditAutomation],
  )

  const toggleExpand = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // ── Loading ───────────────────────────────────────────────────────────

  if (automationsLoading && automations.length === 0) {
    return <OutreachLoading label="Loading automations..." />
  }

  // ── Empty ─────────────────────────────────────────────────────────────

  if (!automationsLoading && automations.length === 0) {
    return (
      <OutreachEmptyState
        icon={Zap}
        title="No automations yet"
        description="Create automated email sequences triggered by form submissions, tags, subscriptions, and more."
        action={
          <Button onClick={onNewAutomation} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Automation
          </Button>
        }
      />
    )
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Stats */}
      <StatTileGrid metrics={stats} columns={4} variant="centered" />

      {/* Automation cards */}
      <div className="space-y-3">
        {automations.map((automation) => (
          <AutomationCard
            key={automation.id}
            automation={automation}
            forms={forms}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onToggleStatus={handleToggleStatus}
            expanded={expandedIds.has(automation.id)}
            onToggleExpand={() => toggleExpand(automation.id)}
          />
        ))}
      </div>
    </div>
  )
}
