/**
 * EchoPill — Floating Echo companion during tours and post-onboarding.
 *
 * A small, draggable pill that floats in the corner with Echo's identity.
 * During tours, it shows contextual tips. After onboarding, it serves as
 * a persistent access point to Echo chat.
 *
 * The pill has two states:
 *   - Collapsed: Small icon + "Ask Echo" label
 *   - Expanded: Opens a mini-chat or shows a contextual tip
 *
 * Visually, it echoes (pun intended) the Sonor sonic identity —
 * frequency bars as the "speaking" indicator, teal glow when active.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { MessageCircle, X, Sparkles } from 'lucide-react'

interface EchoPillProps {
  /** Contextual message to display (e.g., during a tour step) */
  message?: string
  /** Whether Echo is in "tour guide" mode with a visible tip */
  showTip?: boolean
  /** Called when user clicks to open full Echo chat */
  onOpenChat?: () => void
  /** Position corner (default: bottom-right) */
  position?: 'bottom-right' | 'bottom-left'
  /** Additional className */
  className?: string
}

export default function EchoPill({
  message,
  showTip = false,
  onOpenChat,
  position = 'bottom-right',
  className = '',
}: EchoPillProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [tipVisible, setTipVisible] = useState(false)
  const pillRef = useRef<HTMLDivElement>(null)

  // Auto-show tip when message changes
  useEffect(() => {
    if (message && showTip) {
      const timer = setTimeout(() => setTipVisible(true), 300)
      return () => clearTimeout(timer)
    } else {
      setTipVisible(false)
    }
  }, [message, showTip])

  // Auto-dismiss tip after 8 seconds
  useEffect(() => {
    if (tipVisible) {
      const timer = setTimeout(() => setTipVisible(false), 8000)
      return () => clearTimeout(timer)
    }
  }, [tipVisible])

  const handlePillClick = useCallback(() => {
    if (message && showTip) {
      setTipVisible(!tipVisible)
    } else if (onOpenChat) {
      onOpenChat()
    }
  }, [message, showTip, tipVisible, onOpenChat])

  if (isDismissed) return null

  const posStyle = position === 'bottom-right'
    ? { right: 24, bottom: 24 }
    : { left: 24, bottom: 24 }

  return (
    <div
      ref={pillRef}
      className={`echo-pill-container ${className}`}
      style={{ position: 'fixed', zIndex: 9990, ...posStyle }}
    >
      <style>{`
        .echo-pill-container {
          display: flex;
          flex-direction: column;
          align-items: ${position === 'bottom-right' ? 'flex-end' : 'flex-start'};
          gap: 8px;
          pointer-events: auto;
        }

        /* Tip bubble */
        .echo-pill-tip {
          max-width: 280px;
          padding: 14px 16px;
          background: var(--surface-card, #1a1a2e);
          border: 1px solid rgba(57, 191, 176, 0.2);
          border-radius: 14px 14px ${position === 'bottom-right' ? '4px 14px' : '14px 4px'};
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(57, 191, 176, 0.06);
          opacity: 0;
          transform: translateY(8px) scale(0.96);
          transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.23, 1, 0.32, 1);
          pointer-events: none;
        }
        .echo-pill-tip.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }

        .echo-pill-tip-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }

        .echo-pill-tip-badge {
          font-size: 10px;
          font-weight: 600;
          color: #39bfb0;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .echo-pill-tip-text {
          font-size: 13px;
          line-height: 1.55;
          color: var(--text-secondary, rgba(255, 255, 255, 0.65));
          margin: 0;
        }

        /* The pill button */
        .echo-pill-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 100px;
          border: 1px solid rgba(57, 191, 176, 0.25);
          background: var(--surface-card, #1a1a2e);
          color: var(--text-primary, #fff);
          cursor: pointer;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35), 0 0 30px rgba(57, 191, 176, 0.08);
          transition: all 0.2s ease;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          user-select: none;
        }
        .echo-pill-btn:hover {
          border-color: rgba(57, 191, 176, 0.4);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35), 0 0 40px rgba(57, 191, 176, 0.15);
          transform: translateY(-1px);
        }
        .echo-pill-btn:active {
          transform: translateY(0);
        }

        .echo-pill-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(57, 191, 176, 0.15);
          color: #39bfb0;
          flex-shrink: 0;
        }

        /* Sonic bars in the pill — subtle "listening" indicator */
        .echo-pill-sonic {
          display: flex;
          align-items: center;
          gap: 1.5px;
          height: 14px;
        }

        @keyframes echoPillBar {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }

        .echo-pill-sonic-bar {
          width: 2px;
          border-radius: 1px;
          background: #39bfb0;
          transform-origin: center;
          animation: echoPillBar 1.6s ease-in-out infinite;
          opacity: 0.6;
        }

        /* Glow pulse behind pill when tour is active */
        .echo-pill-btn.tour-active::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 100px;
          background: rgba(57, 191, 176, 0.1);
          animation: echoPillGlow 2s ease-in-out infinite;
          z-index: -1;
        }

        @keyframes echoPillGlow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.06); }
        }
      `}</style>

      {/* Tip bubble */}
      {message && (
        <div className={`echo-pill-tip ${tipVisible ? 'visible' : ''}`}>
          <div className="echo-pill-tip-header">
            <Sparkles size={12} color="#39bfb0" />
            <span className="echo-pill-tip-badge">Echo tip</span>
            <button
              onClick={(e) => { e.stopPropagation(); setTipVisible(false) }}
              style={{
                marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.3)', padding: 2, display: 'flex',
              }}
              aria-label="Dismiss tip"
            >
              <X size={12} />
            </button>
          </div>
          <p className="echo-pill-tip-text">{message}</p>
        </div>
      )}

      {/* Pill button */}
      <button
        className={`echo-pill-btn ${showTip ? 'tour-active' : ''}`}
        onClick={handlePillClick}
        style={{ position: 'relative' }}
        aria-label={showTip ? 'Echo tour guide' : 'Ask Echo'}
      >
        <div className="echo-pill-icon">
          {showTip ? <Sparkles size={14} /> : <MessageCircle size={14} />}
        </div>

        {showTip ? (
          <>
            <span>Echo</span>
            <div className="echo-pill-sonic">
              {[0.5, 0.8, 1, 0.7].map((h, i) => (
                <div
                  key={i}
                  className="echo-pill-sonic-bar"
                  style={{ height: h * 14, animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </>
        ) : (
          <span>Ask Echo</span>
        )}
      </button>
    </div>
  )
}
