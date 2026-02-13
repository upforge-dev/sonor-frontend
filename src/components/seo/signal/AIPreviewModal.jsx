// src/components/seo/signal/AIPreviewModal.jsx
// Modal for previewing AI-generated SEO suggestions before applying
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Sparkles,
  RefreshCw,
  Check,
  Copy,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Edit,
  Type,
  FileText,
  Wand2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

const CONTENT_TYPES = {
  title: {
    label: 'Title Tag',
    icon: Type,
    minLength: 30,
    maxLength: 60,
    idealRange: '50-60 characters'
  },
  meta_description: {
    label: 'Meta Description',
    icon: FileText,
    minLength: 120,
    maxLength: 160,
    idealRange: '150-160 characters'
  },
  h1: {
    label: 'H1 Heading',
    icon: Type,
    minLength: 20,
    maxLength: 70,
    idealRange: '20-70 characters'
  }
}

function CharacterCount({ text, type }) {
  const config = CONTENT_TYPES[type] || CONTENT_TYPES.title
  const length = text?.length || 0
  
  const getStatus = () => {
    if (length === 0) return { color: 'text-red-400', message: 'Empty' }
    if (length < config.minLength) return { color: 'text-yellow-400', message: 'Too short' }
    if (length > config.maxLength) return { color: 'text-yellow-400', message: 'Too long' }
    return { color: 'text-green-400', message: 'Optimal' }
  }
  
  const status = getStatus()
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={status.color}>{length}/{config.maxLength}</span>
      <span className="text-[var(--text-tertiary)]">({status.message})</span>
    </div>
  )
}

function DiffView({ before, after, type }) {
  const config = CONTENT_TYPES[type] || CONTENT_TYPES.title
  
  return (
    <div className="space-y-3">
      {/* Before */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
            Current
          </span>
          <CharacterCount text={before} type={type} />
        </div>
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-[var(--text-secondary)] line-through">
          {before || <span className="italic text-red-400">Missing</span>}
        </div>
      </div>
      
      {/* Arrow */}
      <div className="flex justify-center">
        <ArrowRight className="h-4 w-4 text-[var(--text-tertiary)] rotate-90" />
      </div>
      
      {/* After */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--brand-primary)' }}>
            AI Suggestion
          </span>
          <CharacterCount text={after} type={type} />
        </div>
        <div 
          className="p-3 rounded-lg text-sm text-[var(--text-primary)] border" 
          style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--brand-primary) 20%, transparent)' }}
        >
          {after}
        </div>
      </div>
    </div>
  )
}

function SuggestionCard({ suggestion, isSelected, onSelect, index, type }) {
  const copyToClipboard = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(suggestion.text)
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onSelect}
      className={cn(
        'relative p-4 rounded-lg border cursor-pointer transition-all duration-200',
        !isSelected && 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:border-[var(--accent-primary)]/50'
      )}
      style={isSelected ? {
        backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)',
        borderColor: 'color-mix(in srgb, var(--brand-primary) 50%, transparent)',
        boxShadow: '0 0 0 1px color-mix(in srgb, var(--brand-primary) 30%, transparent)'
      } : undefined}
    >
      <div className="flex items-start gap-3">
        <RadioGroupItem value={suggestion.id} id={suggestion.id} className="mt-1" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--text-primary)] leading-relaxed">
            {suggestion.text}
          </p>
          
          <div className="flex items-center gap-3 mt-2">
            <CharacterCount text={suggestion.text} type={type} />
            
            {suggestion.reasoning && (
              <span className="text-xs text-[var(--text-tertiary)]">
                {suggestion.reasoning}
              </span>
            )}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          onClick={copyToClipboard}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      {isSelected && (
        <div className="absolute -top-2 -right-2">
          <div className="flex items-center justify-center h-5 w-5 rounded-full text-white" style={{ backgroundColor: 'var(--brand-primary)' }}>
            <Check className="h-3 w-3" />
          </div>
        </div>
      )}
    </motion.div>
  )
}

/**
 * AIPreviewModal - Preview and select AI-generated SEO suggestions
 * 
 * @param {boolean} open - Whether the modal is open
 * @param {function} onOpenChange - Callback when open state changes
 * @param {string} type - Content type: 'title' | 'meta_description' | 'h1'
 * @param {string} currentValue - Current value of the content
 * @param {array} suggestions - Array of AI suggestions: [{ id, text, reasoning? }]
 * @param {boolean} isLoading - Whether suggestions are being generated
 * @param {function} onSelect - Callback when a suggestion is selected and applied
 * @param {function} onGenerateMore - Callback to generate more suggestions
 * @param {function} onEdit - Callback when user wants to manually edit
 * @param {string} pageUrl - URL of the page being edited (for context)
 */
export default function AIPreviewModal({
  open,
  onOpenChange,
  type = 'title',
  currentValue = '',
  suggestions = [],
  isLoading = false,
  onSelect,
  onGenerateMore,
  onEdit,
  pageUrl
}) {
  const [selectedId, setSelectedId] = useState(null)
  const [customValue, setCustomValue] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  
  const config = CONTENT_TYPES[type] || CONTENT_TYPES.title
  const Icon = config.icon
  
  // Auto-select first suggestion when loaded
  useEffect(() => {
    if (suggestions.length > 0 && !selectedId) {
      setSelectedId(suggestions[0].id)
    }
  }, [suggestions])
  
  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setSelectedId(suggestions[0]?.id || null)
      setIsCustom(false)
      setCustomValue('')
    }
  }, [open])
  
  const selectedSuggestion = suggestions.find(s => s.id === selectedId)
  const finalValue = isCustom ? customValue : selectedSuggestion?.text
  
  const handleApply = () => {
    if (finalValue) {
      onSelect?.(finalValue, isCustom ? 'custom' : selectedId)
      onOpenChange(false)
    }
  }
  
  const handleGenerateMore = () => {
    onGenerateMore?.()
  }
  
  const handleSwitchToCustom = () => {
    setIsCustom(true)
    setCustomValue(selectedSuggestion?.text || currentValue || '')
  }
  
  const handleSwitchToSuggestions = () => {
    setIsCustom(false)
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div 
              className="flex items-center justify-center h-8 w-8 rounded-full" 
              style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 20%, transparent)' }}
            >
              <Sparkles className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                AI {config.label} Suggestions
              </DialogTitle>
              <DialogDescription>
                {pageUrl && (
                  <span className="text-xs truncate block max-w-[400px]">
                    {pageUrl}
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-6">
          {/* Before/After Preview */}
          {selectedSuggestion && !isCustom && (
            <div className="bg-[var(--glass-bg-subtle)] rounded-lg p-4 border border-[var(--glass-border)]">
              <DiffView 
                before={currentValue} 
                after={selectedSuggestion.text} 
                type={type} 
              />
            </div>
          )}
          
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="relative">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--brand-primary)' }} />
                <Sparkles className="h-3 w-3 absolute -top-1 -right-1 animate-pulse" style={{ color: 'var(--brand-secondary)' }} />
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                Generating AI suggestions...
              </p>
            </div>
          )}
          
          {/* Suggestions List */}
          {!isLoading && !isCustom && suggestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-[var(--text-secondary)]">
                  Select a suggestion
                </h4>
                <Badge variant="outline" className="text-xs">
                  {suggestions.length} option{suggestions.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              <RadioGroup 
                value={selectedId} 
                onValueChange={setSelectedId}
                className="space-y-3"
              >
                <AnimatePresence>
                  {suggestions.map((suggestion, index) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      isSelected={selectedId === suggestion.id}
                      onSelect={() => setSelectedId(suggestion.id)}
                      index={index}
                      type={type}
                    />
                  ))}
                </AnimatePresence>
              </RadioGroup>
            </div>
          )}
          
          {/* Custom Edit Mode */}
          {isCustom && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-[var(--text-secondary)]">
                  Custom Edit
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSwitchToSuggestions}
                  className="text-xs"
                >
                  Back to suggestions
                </Button>
              </div>
              
              <div>
                <Textarea
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder={`Enter your custom ${config.label.toLowerCase()}...`}
                  className="min-h-[100px] resize-none"
                />
                <div className="flex justify-end mt-2">
                  <CharacterCount text={customValue} type={type} />
                </div>
              </div>
            </div>
          )}
          
          {/* Empty State */}
          {!isLoading && suggestions.length === 0 && !isCustom && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Wand2 className="h-8 w-8 text-[var(--text-tertiary)]" />
              <p className="text-sm text-[var(--text-secondary)]">
                Click "Generate" to get AI suggestions
              </p>
            </div>
          )}
        </div>
        
        <Separator className="my-4" />
        
        <DialogFooter className="flex-row gap-2 sm:gap-2">
          {!isCustom && suggestions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSwitchToCustom}
              className="mr-auto"
            >
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Edit Manually
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={handleGenerateMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Generate More
          </Button>
          
          <Button
            onClick={handleApply}
            disabled={!finalValue || isLoading}
            className="text-white"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <Check className="h-4 w-4 mr-2" />
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
