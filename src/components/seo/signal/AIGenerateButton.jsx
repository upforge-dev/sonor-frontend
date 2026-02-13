// src/components/seo/signal/AIGenerateButton.jsx
// Inline button to trigger AI generation for SEO content
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Sparkles, Loader2, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSignalAccess } from '@/lib/signal-access'
import { motion } from 'framer-motion'

/**
 * AIGenerateButton - Compact button to trigger AI content generation
 * 
 * @param {string} type - Content type: 'title' | 'meta_description' | 'h1'
 * @param {function} onClick - Callback when button is clicked
 * @param {boolean} isLoading - Whether generation is in progress
 * @param {boolean} disabled - Whether button is disabled
 * @param {string} variant - Button variant: 'icon' | 'default' | 'compact'
 * @param {string} className - Additional CSS classes
 */
export default function AIGenerateButton({
  type = 'title',
  onClick,
  isLoading = false,
  disabled = false,
  variant = 'icon',
  className
}) {
  const { hasAccess: hasSignalAccess } = useSignalAccess()
  const [isHovered, setIsHovered] = useState(false)
  
  const typeLabels = {
    title: 'title tag',
    meta_description: 'meta description',
    h1: 'H1 heading'
  }
  
  const label = typeLabels[type] || 'content'
  
  // Show upgrade tooltip if no access
  if (!hasSignalAccess) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={variant === 'icon' ? 'icon' : 'sm'}
            disabled
            className={cn(
              'text-[var(--text-tertiary)] opacity-50',
              variant === 'icon' && 'h-7 w-7',
              className
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {variant !== 'icon' && (
              <span className="ml-1.5">AI Generate</span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-xs">
            Upgrade to Signal AI to generate {label} suggestions
          </p>
        </TooltipContent>
      </Tooltip>
    )
  }
  
  // Icon variant - just the sparkles icon
  if (variant === 'icon') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            disabled={disabled || isLoading}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
              'h-7 w-7 relative hover:bg-[color:color-mix(in_srgb,var(--brand-primary)_10%,transparent)]',
              className
            )}
            style={{ color: 'var(--brand-primary)' }}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <motion.div
                animate={{ 
                  scale: isHovered ? 1.1 : 1,
                  rotate: isHovered ? 15 : 0
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              >
                <Sparkles className="h-3.5 w-3.5" />
              </motion.div>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">Generate AI {label}</p>
        </TooltipContent>
      </Tooltip>
    )
  }
  
  // Compact variant - small button with icon and short text
  if (variant === 'compact') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        disabled={disabled || isLoading}
        className={cn(
          'h-7 px-2 text-xs hover:bg-[color:color-mix(in_srgb,var(--brand-primary)_10%,transparent)]',
          className
        )}
        style={{ color: 'var(--brand-primary)' }}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <Wand2 className="h-3 w-3 mr-1" />
        )}
        AI
      </Button>
    )
  }
  
  // Default variant - full button
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        'hover:bg-[color:color-mix(in_srgb,var(--brand-primary)_10%,transparent)] hover:border-[color:color-mix(in_srgb,var(--brand-primary)_50%,transparent)]',
        className
      )}
      style={{ color: 'var(--brand-primary)', borderColor: 'color-mix(in srgb, var(--brand-primary) 30%, transparent)' }}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4 mr-2" />
      )}
      Generate AI {label}
    </Button>
  )
}
