/**
 * PipelineKanban - Glass-styled kanban board for sales pipeline
 * Uses pipelineStages from CRM module (same config as sidebar; "Configure pipeline" customizes colors).
 */
import { useMemo, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, CheckCheck, XCircle } from 'lucide-react'
import { UptradeSpinner } from '@/components/UptradeLoading'
import { Button } from '@/components/ui/button'
import ProspectCard from './ProspectCard'
import { GlassEmptyState } from './ui'
import { DEFAULT_PIPELINE_STAGES } from './pipelineStages'

const CLOSED_STAGES = ['closed_won', 'closed_lost']

// Pipeline Column Component
function PipelineColumn({
  stage,
  config,
  prospects,
  selectedProspects,
  onSelectProspect,
  onProspectClick,
  onMoveNext,
  onEmail,
  onCall,
  onViewWebsite,
  onArchive,
  onDrop,
  draggingProspectId,
  onDragStart,
  isLast = false,
  isFocused = false
}) {
  const StageIcon = config.icon
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    // Only set to false if we're leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const prospectId = e.dataTransfer.getData('text/plain')
    if (prospectId) {
      onDrop?.(prospectId, stage)
    }
  }

  return (
    <div 
      className="flex flex-col snap-start h-full flex-1 min-w-[280px]"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header - Fully rounded, separated */}
      <div 
        className="flex-shrink-0 rounded-xl p-3 mb-2 bg-[var(--glass-bg)] border"
        style={{ borderColor: config.borderColor }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: config.color }}
            >
              <StageIcon className="h-4 w-4 text-white" />
            </div>
            <span 
              className="font-semibold text-sm"
              style={{ color: config.textColor }}
            >
              {config.label}
            </span>
          </div>
          
          {/* Count badge - colored background */}
          <div 
            className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: config.color }}
          >
            {prospects.length}
          </div>
        </div>
      </div>
      
      {/* Column Content - native vertical scroll, hidden scrollbar */}
      <div
        data-column-scroll
        className={cn(
          'flex-1 min-h-0 overflow-y-auto rounded-xl border bg-[var(--glass-bg)]/50',
          'transition-all duration-200',
          // Hide scrollbar across browsers
          'scrollbar-none [&::-webkit-scrollbar]:hidden',
          isDragOver && 'ring-2 ring-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
        )}
        style={{ borderColor: config.borderColor, scrollbarWidth: 'none' }}
      >
        <div className={cn(
          'p-2',
          isFocused
            ? 'grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2'
            : 'space-y-2'
        )}>
          {prospects.length === 0 ? (
            <GlassEmptyState
              icon={StageIcon}
              title="No prospects"
              description="in this stage"
              size="sm"
            />
          ) : (
            prospects.map(prospect => (
              <ProspectCard
                key={prospect.id}
                prospect={prospect}
                stageConfig={config}
                isSelected={selectedProspects.includes(prospect.id)}
                isDragging={draggingProspectId === prospect.id}
                onSelect={onSelectProspect}
                onClick={onProspectClick}
                onDragStart={onDragStart}
                onMoveNext={!isLast ? (() => onMoveNext?.(prospect)) : undefined}
                onEmail={() => onEmail?.(prospect)}
                onCall={() => onCall?.(prospect)}
                onViewWebsite={() => onViewWebsite?.(prospect)}
                onArchive={() => onArchive?.(prospect)}
                onViewDetails={onProspectClick}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// Closed Deals Summary - Compact view for won/lost
function ClosedDealsSummary({ 
  wonProspects, 
  lostProspects, 
  isExpanded, 
  onToggle,
  selectedProspects,
  onSelectProspect,
  onProspectClick,
  pipelineStages
}) {
  const stages = pipelineStages || DEFAULT_PIPELINE_STAGES
  const wonConfig = stages.closed_won
  const lostConfig = stages.closed_lost

  return (
    <div className="flex flex-col min-w-0">
      {/* Toggle Header - Rounded with modern styling */}
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center justify-between p-4 rounded-xl',
          'bg-[var(--glass-bg)] border border-[var(--glass-border)]',
          'hover:border-[var(--text-tertiary)]',
          'transition-all duration-200'
        )}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="p-1.5 rounded-lg"
              style={{ backgroundColor: wonConfig.color }}
            >
              <CheckCheck className="h-3.5 w-3.5 text-white" />
            </div>
            <span 
              className="font-semibold text-sm"
              style={{ color: wonConfig.textColor }}
            >
              {wonProspects.length} Won
            </span>
          </div>
          
          <div className="h-4 w-px bg-[var(--glass-border)]" />
          
          <div className="flex items-center gap-2">
            <div 
              className="p-1.5 rounded-lg"
              style={{ backgroundColor: lostConfig.color }}
            >
              <XCircle className="h-3.5 w-3.5 text-white" />
            </div>
            <span 
              className="font-semibold text-sm"
              style={{ color: lostConfig.textColor }}
            >
              {lostProspects.length} Lost
            </span>
          </div>
        </div>
        
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-[var(--text-tertiary)]" />
        ) : (
          <ChevronDown className="h-5 w-5 text-[var(--text-tertiary)]" />
        )}
      </button>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="grid grid-cols-2 gap-4 mt-4 animate-in slide-in-from-top-2 duration-300">
          <PipelineColumn
            stage="closed_won"
            config={wonConfig}
            prospects={wonProspects}
            selectedProspects={selectedProspects}
            onSelectProspect={onSelectProspect}
            onProspectClick={onProspectClick}
            isLast
          />
          <PipelineColumn
            stage="closed_lost"
            config={lostConfig}
            prospects={lostProspects}
            selectedProspects={selectedProspects}
            onSelectProspect={onSelectProspect}
            onProspectClick={onProspectClick}
            isLast
          />
        </div>
      )}
    </div>
  )
}

export default function PipelineKanban({
  pipelineStages: pipelineStagesProp,
  prospects,
  selectedProspects = [],
  isLoading = false,
  showClosedDeals = false,
  focusedStages = [],
  onToggleClosedDeals,
  onSelectProspect,
  onProspectClick,
  onMoveToStage,
  onEmail,
  onCall,
  onViewWebsite,
  onArchive,
  className
}) {
  const pipelineStages = pipelineStagesProp || DEFAULT_PIPELINE_STAGES
  const scrollRef = useRef(null)
  const [isScrollDragging, setIsScrollDragging] = useState(false)
  const dragIntent = useRef(null) // 'horizontal' | 'vertical' | null — decided after first move
  const startPos = useRef({ x: 0, y: 0, scrollLeft: 0 })
  const [draggingProspectId, setDraggingProspectId] = useState(null)

  // Active stage keys (exclude closed) from current config
  const activeStageKeys = useMemo(() => {
    const allActive = Object.keys(pipelineStages).filter(k => !CLOSED_STAGES.includes(k))
    // If specific stages are focused, only show those columns
    if (focusedStages.length > 0) {
      return allActive.filter(k => focusedStages.includes(k))
    }
    return allActive
  }, [pipelineStages, focusedStages])

  const isFocused = focusedStages.length > 0

  // Group prospects by stage
  const prospectsByStage = useMemo(() => {
    const grouped = {}
    Object.keys(pipelineStages).forEach(stage => {
      grouped[stage] = prospects.filter(p => (p.pipeline_stage || 'new_lead') === stage)
    })
    return grouped
  }, [prospects, pipelineStages])

  // Handle move to next stage
  const handleMoveNext = (prospect) => {
    const currentStage = prospect.pipeline_stage || 'new_lead'
    const currentIndex = activeStageKeys.indexOf(currentStage)
    if (currentIndex >= 0 && currentIndex < activeStageKeys.length - 1) {
      onMoveToStage?.(prospect.id, activeStageKeys[currentIndex + 1])
    }
  }

  // Handle drag-and-drop between columns
  const handleDragStart = (prospect) => {
    setDraggingProspectId(prospect.id)
  }

  const handleDrop = (prospectId, newStage) => {
    setDraggingProspectId(null)
    // If the dragged prospect is in the selection and multiple are selected, move all selected; otherwise move just the one
    const idsToMove =
      selectedProspects.length > 1 && selectedProspects.includes(prospectId)
        ? selectedProspects
        : [prospectId]
    idsToMove.forEach((id) => {
      const p = prospects.find((x) => x.id === id)
      if (p && (p.pipeline_stage || 'new_lead') !== newStage) {
        onMoveToStage?.(id, newStage)
      }
    })
  }

  // Clear dragging state when drag ends (e.g., cancelled)
  const handleDragEnd = () => {
    setDraggingProspectId(null)
  }

  // Mouse drag scrolling — supports both horizontal drag-to-scroll AND
  // vertical column scrolling.  On mousedown we record the start position.
  // On the first mousemove we decide intent: if the user moves more
  // horizontally → drag-scroll the board; more vertically → let the column
  // handle native vertical scroll.  This way both gestures coexist.

  const handleMouseDown = useCallback((e) => {
    if (draggingProspectId) return
    if (!scrollRef.current) return
    // Ignore clicks on buttons / interactive elements
    if (e.target.closest('button, [role="menuitem"], input, [data-radix-collection-item]')) return

    dragIntent.current = null // undecided
    startPos.current = {
      x: e.pageX,
      y: e.pageY,
      scrollLeft: scrollRef.current.scrollLeft,
    }
    setIsScrollDragging(true)
  }, [draggingProspectId])

  const handleMouseMove = useCallback((e) => {
    if (!isScrollDragging || !scrollRef.current) return

    const dx = Math.abs(e.pageX - startPos.current.x)
    const dy = Math.abs(e.pageY - startPos.current.y)

    // Decide intent after a small movement threshold (5px)
    if (!dragIntent.current && (dx > 5 || dy > 5)) {
      dragIntent.current = dx >= dy ? 'horizontal' : 'vertical'
    }

    // Vertical intent → stop tracking, let native column scroll work
    if (dragIntent.current === 'vertical') {
      setIsScrollDragging(false)
      return
    }

    // Horizontal intent → drag-scroll the board
    if (dragIntent.current === 'horizontal') {
      e.preventDefault()
      const walk = (e.pageX - startPos.current.x) * 1.5
      scrollRef.current.scrollLeft = startPos.current.scrollLeft - walk
    }
  }, [isScrollDragging])

  const handleMouseUp = useCallback(() => {
    setIsScrollDragging(false)
    dragIntent.current = null
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <UptradeSpinner size="lg" label="Loading pipeline..." />
      </div>
    )
  }

  return (
    <div data-sonor-help="crm/pipeline-kanban" className={cn('flex flex-col flex-1 min-h-0', className)} onDragEnd={handleDragEnd}>
      {/* Kanban Board — relative wrapper gives the absolutely-positioned
          scroll container a real pixel height so columns can scroll. */}
      <div className="flex-1 min-h-0 relative">
        <div 
          ref={scrollRef}
          className={cn(
            'absolute inset-0 overflow-x-auto overflow-y-hidden pl-2 pr-4 pb-2 select-none',
            'scroll-smooth snap-x snap-mandatory touch-pan-x',
            isScrollDragging ? 'cursor-grabbing' : 'cursor-grab'
          )}
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--glass-border) transparent' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Flex row — columns fill space when focused, fixed-width otherwise */}
          <div
            className={cn('flex gap-4 h-full', isFocused && 'w-full')}
            style={isFocused ? undefined : { minWidth: `${activeStageKeys.length * 300}px` }}
          >
            {activeStageKeys.map((stage, index) => (
              <PipelineColumn
                key={stage}
                stage={stage}
                config={pipelineStages[stage]}
                prospects={prospectsByStage[stage] || []}
                selectedProspects={selectedProspects}
                onSelectProspect={onSelectProspect}
                onProspectClick={onProspectClick}
                onMoveNext={handleMoveNext}
                onEmail={onEmail}
                onCall={onCall}
                onViewWebsite={onViewWebsite}
                onArchive={onArchive}
                onDrop={handleDrop}
                onDragStart={handleDragStart}
                draggingProspectId={draggingProspectId}
                isLast={index === activeStageKeys.length - 1}
                isFocused={isFocused}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Closed Deals Section */}
      <div className="flex-shrink-0 pt-4 px-2">
      <ClosedDealsSummary
        wonProspects={prospectsByStage.closed_won || []}
        lostProspects={prospectsByStage.closed_lost || []}
        isExpanded={showClosedDeals}
        onToggle={onToggleClosedDeals}
        selectedProspects={selectedProspects}
        onSelectProspect={onSelectProspect}
        onProspectClick={onProspectClick}
        pipelineStages={pipelineStages}
      />
      </div>
    </div>
  )
}
