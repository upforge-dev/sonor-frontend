// ═══════════════════════════════════════════════════════════════════════════════
// Feature Spotlight Editor
// Interactive pin editor for the portfolioFeatureSpotlight section type.
// Allows placing annotation pins on a screenshot, editing labels/descriptions,
// and optionally asking Signal AI to auto-annotate.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { GlassCard } from '@/components/ui/glass-card'
import { SonorSpinner } from '@/components/SonorLoading'
import { cn } from '@/lib/utils'
import {
  Plus, Trash2, GripVertical, Sparkles, Target, X,
  MousePointer, Move, ZoomIn, ZoomOut, RotateCcw,
} from 'lucide-react'

// ─── Pin on the canvas ───────────────────────────────────────────────────────

function AnnotationPin({ index, x, y, isActive, onClick }) {
  const size = isActive ? 22 : 16
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick(index) }}
      className={cn(
        'absolute flex items-center justify-center rounded-full',
        'font-semibold text-white transition-all duration-150 -translate-x-1/2 -translate-y-1/2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]',
        isActive && 'ring-[3px] ring-[var(--brand-primary)] shadow-[0_0_12px_var(--brand-primary)]',
      )}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        fontSize: isActive ? 11 : 9,
        backgroundColor: 'var(--brand-primary)',
        zIndex: isActive ? 20 : 10,
      }}
    >
      {index + 1}
    </button>
  )
}

// ─── Pin card in the list ────────────────────────────────────────────────────

function PinCard({ pin, index, isActive, onSelect, onChange, onDelete }) {
  return (
    <GlassCard
      className={cn(
        'relative transition-all duration-150',
        isActive
          ? 'border-l-[3px] border-l-[var(--brand-primary)]'
          : 'border-l-[3px] border-l-transparent',
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(index)}
        className="absolute inset-0 z-0 cursor-pointer"
        aria-label={`Select pin ${index + 1}`}
      />
      <div className="relative z-10 p-3 space-y-2 pointer-events-none">
        {/* Header row */}
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-[var(--text-tertiary)] shrink-0" />
          <Badge
            className="shrink-0 text-xs font-semibold text-white border-none"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {index + 1}
          </Badge>
          <span className="text-xs text-[var(--text-tertiary)] truncate">
            ({pin.x.toFixed(1)}%, {pin.y.toFixed(1)}%)
          </span>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onDelete(index) }}
            className="pointer-events-auto ml-auto p-1 rounded text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
            aria-label={`Delete pin ${index + 1}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Label */}
        <div className="pointer-events-auto">
          <Input
            placeholder="Label"
            value={pin.label}
            onChange={e => onChange(index, { ...pin, label: e.target.value })}
            onClick={e => e.stopPropagation()}
            className="h-8 text-sm bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
          />
        </div>

        {/* Description */}
        <div className="pointer-events-auto">
          <Textarea
            placeholder="Description"
            value={pin.description}
            rows={2}
            onChange={e => onChange(index, { ...pin, description: e.target.value })}
            onClick={e => e.stopPropagation()}
            className="text-sm bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none"
          />
        </div>
      </div>
    </GlassCard>
  )
}

// ─── Main editor ─────────────────────────────────────────────────────────────

export default function FeatureSpotlightEditor({
  image,
  annotations = [],
  onAnnotationsChange,
  onRequestSignalAnnotation,
  title,
  description,
  layout = 'left',
}) {
  const [activePin, setActivePin] = useState(null)
  const [addMode, setAddMode] = useState(false)
  const [signalOpen, setSignalOpen] = useState(false)
  const [signalDirective, setSignalDirective] = useState('')
  const [signalLoading, setSignalLoading] = useState(false)
  const canvasRef = useRef(null)
  const listRef = useRef(null)

  // Scroll selected pin card into view
  useEffect(() => {
    if (activePin == null || !listRef.current) return
    const card = listRef.current.querySelector(`[data-pin-index="${activePin}"]`)
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activePin])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCanvasClick = useCallback(
    e => {
      if (!addMode || !canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100

      const newPin = {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        label: '',
        description: '',
      }
      const updated = [...annotations, newPin]
      onAnnotationsChange(updated)
      setActivePin(updated.length - 1)
      setAddMode(false)
    },
    [addMode, annotations, onAnnotationsChange],
  )

  const handlePinClick = useCallback(index => {
    setActivePin(index)
    setAddMode(false)
  }, [])

  const handlePinChange = useCallback(
    (index, updated) => {
      const next = annotations.map((p, i) => (i === index ? updated : p))
      onAnnotationsChange(next)
    },
    [annotations, onAnnotationsChange],
  )

  const handlePinDelete = useCallback(
    index => {
      const next = annotations.filter((_, i) => i !== index)
      onAnnotationsChange(next)
      if (activePin === index) setActivePin(null)
      else if (activePin != null && activePin > index) setActivePin(activePin - 1)
    },
    [annotations, onAnnotationsChange, activePin],
  )

  const handleSignalSubmit = useCallback(
    async () => {
      if (!onRequestSignalAnnotation || !signalDirective.trim()) return
      setSignalLoading(true)
      try {
        const result = await onRequestSignalAnnotation(image, signalDirective.trim())
        if (Array.isArray(result) && result.length > 0) {
          const merged = [
            ...annotations,
            ...result.map(a => ({
              x: a.x ?? 50,
              y: a.y ?? 50,
              label: a.label ?? '',
              description: a.description ?? '',
              icon: a.icon,
            })),
          ]
          onAnnotationsChange(merged)
          setActivePin(annotations.length) // select first new pin
        }
      } finally {
        setSignalLoading(false)
        setSignalOpen(false)
        setSignalDirective('')
      }
    },
    [onRequestSignalAnnotation, signalDirective, image, annotations, onAnnotationsChange],
  )

  const handleClearAll = useCallback(() => {
    onAnnotationsChange([])
    setActivePin(null)
  }, [onAnnotationsChange])

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full">
      {/* ── Left: image canvas ──────────────────────────────────────────── */}
      <div className="lg:w-[60%] w-full space-y-2">
        {title && (
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
        )}
        {description && (
          <p className="text-xs text-[var(--text-secondary)] mb-2">{description}</p>
        )}

        <div
          ref={canvasRef}
          onClick={handleCanvasClick}
          className={cn(
            'relative w-full overflow-hidden rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]',
            addMode ? 'cursor-crosshair' : 'cursor-default',
          )}
        >
          {image ? (
            <img
              src={image}
              alt="Feature screenshot"
              className="w-full h-auto block select-none pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-[var(--text-tertiary)] text-sm">
              No image provided
            </div>
          )}

          {/* Annotation pins */}
          {annotations.map((pin, i) => (
            <AnnotationPin
              key={i}
              index={i}
              x={pin.x}
              y={pin.y}
              isActive={activePin === i}
              onClick={handlePinClick}
            />
          ))}

          {/* Add-mode overlay hint */}
          {addMode && (
            <div className="absolute inset-0 bg-[var(--brand-primary)]/5 pointer-events-none flex items-center justify-center">
              <div className="bg-[var(--glass-bg)]/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[var(--glass-border)] text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                Click anywhere to place a pin
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: pin list editor ──────────────────────────────────────── */}
      <div className="lg:w-[40%] w-full flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">
              Annotations
            </h4>
            <Badge
              variant="outline"
              className="border-[var(--glass-border)] text-[var(--text-secondary)] text-xs"
            >
              {annotations.length}
            </Badge>
          </div>
          {annotations.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-[var(--text-tertiary)] hover:text-red-500 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-3">
          <Button
            size="sm"
            variant={addMode ? 'default' : 'outline'}
            onClick={() => setAddMode(!addMode)}
            className={cn(
              addMode
                ? 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90'
                : 'border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]',
            )}
          >
            {addMode ? (
              <>
                <MousePointer className="mr-1 h-3.5 w-3.5" />
                Click to place
              </>
            ) : (
              <>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Pin
              </>
            )}
          </Button>

          {onRequestSignalAnnotation && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSignalOpen(!signalOpen)}
              disabled={signalLoading}
              className="border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]"
            >
              <Sparkles className="mr-1 h-3.5 w-3.5 text-[var(--brand-primary)]" />
              Ask Signal
            </Button>
          )}
        </div>

        {/* Signal directive input */}
        {signalOpen && !signalLoading && (
          <GlassCard className="p-3 mb-3 space-y-2">
            <Label className="text-xs text-[var(--text-secondary)]">
              Describe what's in this screenshot so Signal can suggest annotations
            </Label>
            <Textarea
              placeholder="e.g. This is our homepage hero section showing the main CTA and feature cards..."
              value={signalDirective}
              onChange={e => setSignalDirective(e.target.value)}
              rows={3}
              className="text-sm bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setSignalOpen(false); setSignalDirective('') }}
                className="text-[var(--text-secondary)]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!signalDirective.trim()}
                onClick={handleSignalSubmit}
                className="bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90"
              >
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Annotate
              </Button>
            </div>
          </GlassCard>
        )}

        {/* Signal loading state */}
        {signalLoading && (
          <GlassCard className="p-6 mb-3 flex flex-col items-center gap-3">
            <SonorSpinner size="sm" label="Signal is analyzing your screenshot..." />
          </GlassCard>
        )}

        {/* Pin list */}
        <ScrollArea className="flex-1 min-h-0">
          <div ref={listRef} className="space-y-2 pr-1">
            {annotations.length === 0 && !addMode && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{
                    background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary)/60)',
                  }}
                >
                  <Target className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">
                  No annotations yet
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Click "Add Pin" then click on the image to place annotations.
                </p>
              </div>
            )}

            {annotations.map((pin, i) => (
              <div key={i} data-pin-index={i}>
                <PinCard
                  pin={pin}
                  index={i}
                  isActive={activePin === i}
                  onSelect={handlePinClick}
                  onChange={handlePinChange}
                  onDelete={handlePinDelete}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
