/**
 * TourOverlay — Spotlight + tooltip system for module walkthroughs.
 *
 * Renders a full-screen dark overlay with a cut-out spotlight around
 * the target element, plus an anchored tooltip with step content.
 * Includes smooth transitions between steps and keyboard navigation.
 *
 * Architecture:
 *   - Reads target element via `data-tour="step-id"` attribute
 *   - Calculates bounding rect and positions spotlight + tooltip
 *   - Handles scroll-into-view for off-screen elements
 *   - Supports top/bottom/left/right tooltip placement with auto-flip
 *   - Animates spotlight movement between steps
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react'

export interface TourStep {
  /** Matches `data-tour="this-id"` on the target element */
  target: string
  /** Headline for this step */
  title: string
  /** Description body — supports basic markdown-ish line breaks */
  content: string
  /** Preferred tooltip placement (auto-flips if no room) */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** If true, highlight without a specific element (centered tooltip) */
  floating?: boolean
  /** Optional action label for the primary button (default: "Next") */
  actionLabel?: string
  /** Optional callback when this step becomes active */
  onEnter?: () => void
}

interface TourOverlayProps {
  /** Ordered list of tour steps */
  steps: TourStep[]
  /** Current step index */
  currentStep: number
  /** Called when user advances to next step */
  onNext: () => void
  /** Called when user goes back */
  onPrev: () => void
  /** Called when tour is dismissed or completed */
  onClose: () => void
  /** Module name for the header badge */
  moduleName?: string
}

// Padding around the spotlight cutout
const SPOTLIGHT_PADDING = 12
// Gap between spotlight and tooltip
const TOOLTIP_GAP = 16
// Tooltip max width
const TOOLTIP_MAX_WIDTH = 360

function getElementRect(target: string): DOMRect | null {
  const el = document.querySelector(`[data-tour="${target}"]`)
  if (!el) return null

  // Scroll into view if needed
  const rect = el.getBoundingClientRect()
  if (rect.top < 0 || rect.bottom > window.innerHeight) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Return updated rect after a frame
    return el.getBoundingClientRect()
  }
  return rect
}

function computeTooltipPosition(
  targetRect: DOMRect | null,
  placement: 'top' | 'bottom' | 'left' | 'right',
  tooltipWidth: number,
  tooltipHeight: number,
): { top: number; left: number; actualPlacement: string; arrowLeft?: number; arrowTop?: number } {
  if (!targetRect) {
    // Floating centered
    return {
      top: window.innerHeight / 2 - tooltipHeight / 2,
      left: window.innerWidth / 2 - tooltipWidth / 2,
      actualPlacement: 'center',
    }
  }

  const pad = SPOTLIGHT_PADDING + TOOLTIP_GAP
  let top = 0
  let left = 0
  let actualPlacement = placement

  // Try preferred placement, flip if insufficient space
  switch (placement) {
    case 'bottom': {
      top = targetRect.bottom + pad
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
      if (top + tooltipHeight > window.innerHeight - 20) {
        // Flip to top
        top = targetRect.top - pad - tooltipHeight
        actualPlacement = 'top'
      }
      break
    }
    case 'top': {
      top = targetRect.top - pad - tooltipHeight
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
      if (top < 20) {
        top = targetRect.bottom + pad
        actualPlacement = 'bottom'
      }
      break
    }
    case 'right': {
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
      left = targetRect.right + pad
      if (left + tooltipWidth > window.innerWidth - 20) {
        left = targetRect.left - pad - tooltipWidth
        actualPlacement = 'left'
      }
      break
    }
    case 'left': {
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
      left = targetRect.left - pad - tooltipWidth
      if (left < 20) {
        left = targetRect.right + pad
        actualPlacement = 'right'
      }
      break
    }
  }

  // Clamp to viewport
  left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16))
  top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16))

  // Arrow position relative to tooltip
  const arrowLeft = actualPlacement === 'top' || actualPlacement === 'bottom'
    ? Math.max(24, Math.min(targetRect.left + targetRect.width / 2 - left, tooltipWidth - 24))
    : undefined
  const arrowTop = actualPlacement === 'left' || actualPlacement === 'right'
    ? Math.max(24, Math.min(targetRect.top + targetRect.height / 2 - top, tooltipHeight - 24))
    : undefined

  return { top, left, actualPlacement, arrowLeft, arrowTop }
}

export default function TourOverlay({
  steps,
  currentStep,
  onNext,
  onPrev,
  onClose,
  moduleName,
}: TourOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, actualPlacement: 'bottom', arrowLeft: 0, arrowTop: 0 })
  const [isTransitioning, setIsTransitioning] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const step = steps[currentStep]
  const isLast = currentStep === steps.length - 1
  const isFirst = currentStep === 0

  // Measure target and position tooltip
  const measure = useCallback(() => {
    if (!step) return

    const rect = step.floating ? null : getElementRect(step.target)
    setTargetRect(rect)

    // Use a rAF to let the tooltip render first for measurement
    requestAnimationFrame(() => {
      const tooltipEl = tooltipRef.current
      const tw = tooltipEl?.offsetWidth || TOOLTIP_MAX_WIDTH
      const th = tooltipEl?.offsetHeight || 200
      const pos = computeTooltipPosition(rect, step.placement || 'bottom', tw, th)
      setTooltipPos(pos as any)
    })
  }, [step])

  // Remeasure when step changes
  useEffect(() => {
    if (!step) return

    step.onEnter?.()

    setIsTransitioning(true)
    // Brief delay for DOM to update (e.g., after navigation)
    const timer = setTimeout(() => {
      measure()
      setIsTransitioning(false)
    }, 150)

    return () => clearTimeout(timer)
  }, [currentStep, step, measure])

  // Remeasure on resize/scroll
  useEffect(() => {
    const handler = () => measure()
    window.addEventListener('resize', handler)
    window.addEventListener('scroll', handler, true)
    return () => {
      window.removeEventListener('resize', handler)
      window.removeEventListener('scroll', handler, true)
    }
  }, [measure])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' || e.key === 'Enter') onNext()
      if (e.key === 'ArrowLeft' && !isFirst) onPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, onNext, onPrev, isFirst])

  if (!step) return null

  // Spotlight cutout dimensions
  const spotlight = targetRect
    ? {
        x: targetRect.left - SPOTLIGHT_PADDING,
        y: targetRect.top - SPOTLIGHT_PADDING,
        width: targetRect.width + SPOTLIGHT_PADDING * 2,
        height: targetRect.height + SPOTLIGHT_PADDING * 2,
        rx: 12,
      }
    : null

  return (
    <div className="tour-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      <style>{`
        .tour-overlay {
          font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
        }

        .tour-backdrop {
          position: absolute;
          inset: 0;
          transition: opacity 0.3s ease;
        }

        .tour-tooltip {
          position: absolute;
          width: ${TOOLTIP_MAX_WIDTH}px;
          max-width: calc(100vw - 32px);
          background: var(--surface-card, #1a1a2e);
          border: 1px solid rgba(57, 191, 176, 0.2);
          border-radius: 16px;
          padding: 0;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(57, 191, 176, 0.08);
          transition: top 0.35s cubic-bezier(0.23, 1, 0.32, 1),
                      left 0.35s cubic-bezier(0.23, 1, 0.32, 1),
                      opacity 0.25s ease;
          z-index: 10000;
        }

        .tour-tooltip.transitioning {
          opacity: 0.6;
          transform: scale(0.97);
        }

        .tour-tooltip-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px 0;
        }

        .tour-tooltip-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 100px;
          background: rgba(57, 191, 176, 0.12);
          color: #39bfb0;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .tour-tooltip-badge-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #39bfb0;
          animation: tourBadgePulse 2s ease-in-out infinite;
        }

        @keyframes tourBadgePulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .tour-tooltip-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-tertiary, rgba(255, 255, 255, 0.3));
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .tour-tooltip-close:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-secondary, rgba(255, 255, 255, 0.6));
        }

        .tour-tooltip-body {
          padding: 14px 20px 8px;
        }

        .tour-tooltip-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          margin: 0 0 8px;
          line-height: 1.3;
        }

        .tour-tooltip-content {
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--text-secondary, rgba(255, 255, 255, 0.6));
          margin: 0;
        }

        .tour-tooltip-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px 16px;
          gap: 12px;
        }

        .tour-step-dots {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .tour-step-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          transition: background 0.25s, transform 0.25s;
        }
        .tour-step-dot.active {
          background: #39bfb0;
          transform: scale(1.3);
        }
        .tour-step-dot.completed {
          background: rgba(57, 191, 176, 0.4);
        }

        .tour-tooltip-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .tour-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .tour-btn-primary {
          background: #39bfb0;
          color: #0a0a0f;
        }
        .tour-btn-primary:hover {
          background: #4dd4c5;
          box-shadow: 0 0 20px rgba(57, 191, 176, 0.3);
        }

        .tour-btn-ghost {
          background: transparent;
          color: var(--text-secondary, rgba(255, 255, 255, 0.5));
        }
        .tour-btn-ghost:hover {
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-primary, #fff);
        }

        /* Arrow */
        .tour-arrow {
          position: absolute;
          width: 12px;
          height: 12px;
          background: var(--surface-card, #1a1a2e);
          border: 1px solid rgba(57, 191, 176, 0.2);
          transform: rotate(45deg);
        }
        .tour-arrow-top {
          bottom: -7px;
          border-top: none;
          border-left: none;
        }
        .tour-arrow-bottom {
          top: -7px;
          border-bottom: none;
          border-right: none;
        }
        .tour-arrow-left {
          right: -7px;
          border-top: none;
          border-left: none;
        }
        .tour-arrow-right {
          left: -7px;
          border-bottom: none;
          border-right: none;
        }

        /* Sonic frequency indicator in header */
        .tour-sonic-indicator {
          display: flex;
          align-items: center;
          gap: 1.5px;
          height: 12px;
        }
        @keyframes tourSonicBar {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        .tour-sonic-bar {
          width: 2px;
          border-radius: 1px;
          background: #39bfb0;
          transform-origin: center;
          animation: tourSonicBar 1.4s ease-in-out infinite;
        }
      `}</style>

      {/* Dark overlay with spotlight cutout */}
      <svg className="tour-backdrop" width="100%" height="100%">
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlight && (
              <rect
                x={spotlight.x}
                y={spotlight.y}
                width={spotlight.width}
                height={spotlight.height}
                rx={spotlight.rx}
                fill="black"
                style={{ transition: 'all 0.35s cubic-bezier(0.23, 1, 0.32, 1)' }}
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.65)"
          mask="url(#tour-spotlight-mask)"
        />
        {/* Spotlight glow ring */}
        {spotlight && (
          <rect
            x={spotlight.x - 2}
            y={spotlight.y - 2}
            width={spotlight.width + 4}
            height={spotlight.height + 4}
            rx={spotlight.rx + 2}
            fill="none"
            stroke="rgba(57, 191, 176, 0.25)"
            strokeWidth="2"
            style={{ transition: 'all 0.35s cubic-bezier(0.23, 1, 0.32, 1)' }}
          />
        )}
      </svg>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`tour-tooltip ${isTransitioning ? 'transitioning' : ''}`}
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
        }}
        role="dialog"
        aria-label={`Tour step ${currentStep + 1} of ${steps.length}`}
      >
        {/* Arrow */}
        {tooltipPos.actualPlacement !== 'center' && (
          <div
            className={`tour-arrow tour-arrow-${tooltipPos.actualPlacement}`}
            style={{
              ...(tooltipPos.arrowLeft != null ? { left: tooltipPos.arrowLeft } : {}),
              ...(tooltipPos.arrowTop != null ? { top: tooltipPos.arrowTop } : {}),
            }}
          />
        )}

        {/* Header */}
        <div className="tour-tooltip-header">
          <div className="tour-tooltip-badge">
            <div className="tour-sonic-indicator">
              {[0.5, 0.8, 1, 0.7, 0.4].map((h, i) => (
                <div
                  key={i}
                  className="tour-sonic-bar"
                  style={{ height: h * 12, animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            {moduleName ? `${moduleName} Tour` : 'Tour'}
            <span style={{ opacity: 0.5, marginLeft: 4 }}>
              {currentStep + 1}/{steps.length}
            </span>
          </div>

          <button className="tour-tooltip-close" onClick={onClose} aria-label="Close tour">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="tour-tooltip-body">
          <h3 className="tour-tooltip-title">{step.title}</h3>
          <p className="tour-tooltip-content">{step.content}</p>
        </div>

        {/* Footer */}
        <div className="tour-tooltip-footer">
          {/* Step dots */}
          <div className="tour-step-dots">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`tour-step-dot ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="tour-tooltip-actions">
            {!isFirst && (
              <button className="tour-btn tour-btn-ghost" onClick={onPrev}>
                <ChevronLeft size={14} />
                Back
              </button>
            )}
            <button className="tour-btn tour-btn-primary" onClick={onNext}>
              {isLast ? (
                <>
                  <Check size={14} />
                  {step.actionLabel || 'Finish'}
                </>
              ) : (
                <>
                  {step.actionLabel || 'Next'}
                  <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
