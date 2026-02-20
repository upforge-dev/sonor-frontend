// src/components/seo/signal/SignalStatusBanner.jsx
// Shows Signal AI status, memory, and latest insight
import { motion } from 'framer-motion'
import { Sparkles, History, Zap, ArrowRight } from 'lucide-react'
import SignalIcon from '@/components/ui/SignalIcon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function SignalStatusBanner({
  siteDomain,
  analyzingDays = 0,
  recommendationCount = 0,
  winCount = 0,
  latestInsight = null,
  onViewMemory,
  onApply,
  className
}) {
  const hasStats = analyzingDays > 0 || recommendationCount > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-xl border',
        className
      )}
      style={{
        background: 'linear-gradient(to right, color-mix(in srgb, var(--brand-primary) 10%, transparent), color-mix(in srgb, var(--brand-primary) 10%, transparent), color-mix(in srgb, var(--brand-primary) 10%, transparent))',
        borderColor: 'color-mix(in srgb, var(--brand-primary) 20%, transparent)'
      }}
    >
      {/* Background glow effect */}
      <div 
        className="absolute inset-0 opacity-50" 
        style={{ background: 'linear-gradient(to right, color-mix(in srgb, var(--brand-primary) 5%, transparent), color-mix(in srgb, var(--brand-primary) 5%, transparent))' }} 
      />
      
      <div className="relative p-4 md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="flex items-center justify-center w-8 h-8 rounded-full" 
                style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 20%, transparent)' }}
              >
                <Sparkles className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
              </div>
              <h3 className="font-semibold text-[var(--text-primary)]">
                Signal Status
              </h3>
              {onViewMemory && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  onClick={onViewMemory}
                >
                  <History className="h-3 w-3 mr-1" />
                  View Memory
                </Button>
              )}
            </div>

            {/* Stats row */}
            {hasStats && (
              <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)] mb-3">
                <span className="flex items-center gap-1">
                  <SignalIcon className="h-3.5 w-3.5" style={{ color: 'var(--brand-primary)' }} />
                  Analyzing {siteDomain} for {analyzingDays} days
                </span>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span>{recommendationCount} recommendations</span>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span style={{ color: 'var(--brand-primary)' }}>{winCount} wins</span>
              </div>
            )}

            {/* Latest insight */}
            {latestInsight && (
              <div className="bg-[var(--glass-bg)] rounded-lg p-3 border border-[var(--glass-border)]">
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                  "{latestInsight}"
                </p>
              </div>
            )}
          </div>

          {/* Apply button */}
          {onApply && latestInsight && (
            <Button 
              size="sm" 
              className="shrink-0 text-white"
              style={{ backgroundColor: 'var(--brand-primary)' }}
              onClick={onApply}
            >
              Apply
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
