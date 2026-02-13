// src/components/seo/signal/SignalSuggestion.jsx
// Individual Signal suggestion with confidence indicator
import { motion } from 'framer-motion'
import { Sparkles, Check, X, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const getConfidenceLevel = (confidence) => {
  if (confidence >= 90) return { label: 'High', color: 'text-emerald-400', bg: 'bg-emerald-500/20', dot: 'bg-emerald-400' }
  if (confidence >= 70) return { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/20', dot: 'bg-yellow-400' }
  if (confidence >= 50) return { label: 'Low', color: 'text-orange-400', bg: 'bg-orange-500/20', dot: 'bg-orange-400' }
  return { label: 'Uncertain', color: 'text-gray-400', bg: 'bg-gray-500/20', dot: 'bg-gray-400' }
}

export default function SignalSuggestion({
  id,
  text,
  confidence = 75,
  reason,
  category,
  currentValue,
  suggestedValue,
  onApply,
  onDismiss,
  isApplying = false,
  className
}) {
  const level = getConfidenceLevel(confidence)

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={cn(
        'p-4 rounded-lg border transition-colors',
        'bg-[var(--glass-bg)] border-[var(--glass-border)]',
        'hover:border-[color:color-mix(in_srgb,var(--brand-primary)_30%,transparent)]',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Confidence indicator */}
        <div className={cn('flex items-center justify-center w-6 h-6 rounded-full shrink-0', level.bg)}>
          <div className={cn('w-2 h-2 rounded-full', level.dot)} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header with confidence */}
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className={cn('text-xs', level.bg, level.color)}>
              {level.label} ({confidence}%)
            </Badge>
            {category && (
              <Badge variant="outline" className="text-xs">
                {category}
              </Badge>
            )}
          </div>

          {/* Suggestion text */}
          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
            {text}
          </p>

          {/* Reason with tooltip */}
          {reason && (
            <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
              <Sparkles className="h-3 w-3" style={{ color: 'var(--brand-primary)' }} />
              <span>{reason}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-[var(--text-tertiary)] cursor-help ml-1" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">
                      Signal learned this pattern from analyzing your site's performance data.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Before/After preview */}
          {currentValue && suggestedValue && (
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-mono shrink-0">-</span>
                <span className="text-[var(--text-tertiary)] line-through break-all">{currentValue}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-mono shrink-0">+</span>
                <span className="text-emerald-400 break-all">{suggestedValue}</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-[color:color-mix(in_srgb,var(--brand-primary)_10%,transparent)]"
            style={{ color: 'var(--brand-primary)' }}
            onClick={() => onApply?.(id)}
            disabled={isApplying}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-[var(--text-tertiary)] hover:text-red-400 hover:bg-red-500/10"
            onClick={() => onDismiss?.(id)}
            disabled={isApplying}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
