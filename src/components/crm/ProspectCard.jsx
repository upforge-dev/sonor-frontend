/**
 * ProspectCard - Compact kanban card for sales pipeline
 * Fixed height, no hover resize. All info + actions always visible.
 */
import { memo } from 'react'
import { cn } from '@/lib/utils'
import { 
  Mail,
  Phone,
  Building2,
  Clock,
  ArrowRight,
  MoreHorizontal,
  Globe,
  Link2,
  FileText
} from 'lucide-react'
import { LeadQualityBadge } from './ui'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Format relative time
function formatRelativeTime(date) {
  if (!date) return null
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const ProspectCard = memo(function ProspectCard({
  prospect,
  stageConfig,
  isSelected = false,
  onSelect,
  onClick,
  onMoveNext,
  onEmail,
  onCall,
  onViewWebsite,
  onViewDetails,
  onSendGatedLink,
  onSendContract,
  onArchive,
  onDragStart,
  isDragging = false,
  className
}) {
  const handleQuickAction = (e, action) => {
    e.stopPropagation()
    action?.()
  }

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', prospect.id)
    e.dataTransfer.effectAllowed = 'move'
    onDragStart?.(prospect)
  }

  const lastActivity = prospect.last_call?.created_at || prospect.updated_at || prospect.created_at
  const hasQuoteReady = !!prospect.quote_submitted_at

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        'group relative px-2.5 py-2 cursor-grab select-none rounded-lg transition-colors duration-150',
        'bg-[var(--glass-bg)] border border-[var(--glass-border)]',
        'hover:border-[var(--text-tertiary)]',
        hasQuoteReady && 'border-amber-500/40 bg-amber-500/5',
        isDragging && 'opacity-50 scale-95',
        isSelected && 'ring-2 ring-offset-1 ring-offset-[var(--bg-primary)]',
        className
      )}
      style={isSelected ? { '--tw-ring-color': stageConfig?.color || 'var(--brand-primary)' } : undefined}
      onClick={() => onClick?.(prospect)}
    >
      {/* Row 1: Checkbox + Name + Lead quality + Overflow menu */}
      <div className="flex items-center gap-1.5">
        {/* Checkbox - always in layout to prevent shift, visually hidden until hover/selected */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect?.(prospect.id)}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'h-3.5 w-3.5 flex-shrink-0 transition-opacity duration-150',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        />

        <h4 className="flex-1 min-w-0 font-medium text-sm text-[var(--text-primary)] truncate leading-tight">
          {prospect.name}
        </h4>

        <LeadQualityBadge score={prospect.avg_lead_quality} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="flex-shrink-0 p-0.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--glass-border)]/50 transition-colors">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onViewDetails?.(prospect)}>
              View Details
            </DropdownMenuItem>
            {prospect.website && (
              <DropdownMenuItem onClick={() => window.open(prospect.website, '_blank')}>
                Open Website
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSendGatedLink?.(prospect) }}>
              <Link2 className="h-4 w-4 mr-2" />
              Send Gated Link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSendContract?.(prospect) }}>
              <FileText className="h-4 w-4 mr-2" />
              Send Contract
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600"
              onClick={() => onArchive?.(prospect)}
            >
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Row 2: Company + Last activity */}
      <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-[var(--text-tertiary)] leading-tight">
        {prospect.company ? (
          <span className="flex items-center gap-1 min-w-0 truncate">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{prospect.company}</span>
          </span>
        ) : (
          <span />
        )}
        {lastActivity && (
          <span className="flex items-center gap-1 flex-shrink-0">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(lastActivity)}
          </span>
        )}
      </div>

      {/* Quote ready badge */}
      {hasQuoteReady && (
        <div className="flex items-center gap-1 mt-1">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <FileText className="h-2.5 w-2.5" />
            Quote Ready
          </span>
        </div>
      )}

      {/* Row 3: Quick actions - always visible */}
      <div className="flex items-center gap-0.5 mt-1.5 -ml-0.5">
        {prospect.email && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
                onClick={(e) => handleQuickAction(e, () => onEmail?.(prospect))}
              >
                <Mail className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Email</TooltipContent>
          </Tooltip>
        )}
        
        {prospect.phone && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
                onClick={(e) => handleQuickAction(e, () => onCall?.(prospect))}
              >
                <Phone className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Call</TooltipContent>
          </Tooltip>
        )}
        
        {prospect.website && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
                onClick={(e) => handleQuickAction(e, () => onViewWebsite?.(prospect))}
              >
                <Globe className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Website</TooltipContent>
          </Tooltip>
        )}

        {onMoveNext && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-[var(--text-tertiary)] hover:text-emerald-500 hover:bg-emerald-500/10"
                onClick={(e) => handleQuickAction(e, () => onMoveNext?.(prospect))}
              >
                <ArrowRight className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Next stage</TooltipContent>
          </Tooltip>
        )}

        {/* Spacer + activity count pushed right */}
        <div className="flex-1" />
        {prospect.call_count > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-tertiary)] mr-0.5">
                <Phone className="h-2.5 w-2.5" />
                {prospect.call_count}
              </span>
            </TooltipTrigger>
            <TooltipContent>{prospect.call_count} calls</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
})

export default ProspectCard
