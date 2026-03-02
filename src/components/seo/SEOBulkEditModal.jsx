// src/components/seo/SEOBulkEditModal.jsx
// Bulk Edit Mode - Select pages → Generate all AI suggestions → Review → Apply batch
import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Sparkles,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Type,
  FileText,
  AlertTriangle,
  RefreshCw,
  Wand2,
  CheckCircle2,
  XCircle,
  Edit3,
  ArrowRight,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { seoApi } from '@/lib/portal-api'
import { toast } from 'sonner'

// Bulk edit steps
const STEPS = [
  { id: 'select', label: 'Select Pages', icon: Check },
  { id: 'generate', label: 'Generate AI', icon: Sparkles },
  { id: 'review', label: 'Review Changes', icon: Edit3 },
  { id: 'apply', label: 'Apply', icon: Zap }
]

// Field configuration
const FIELD_CONFIG = {
  title: {
    label: 'Title',
    icon: Type,
    maxLength: 60,
    placeholder: 'Page title for SEO'
  },
  meta_description: {
    label: 'Meta Description',
    icon: FileText,
    maxLength: 160,
    placeholder: 'Compelling meta description'
  }
}

/**
 * SEOBulkEditModal - Multi-page AI optimization workflow
 * 
 * @param {boolean} open - Modal open state
 * @param {function} onOpenChange - Open state change handler
 * @param {string} projectId - Project ID
 * @param {array} pages - Array of pages to potentially edit
 * @param {string} field - Field to edit: 'title' | 'meta_description' | 'both'
 * @param {function} onComplete - Callback when bulk edit is complete
 */
export default function SEOBulkEditModal({
  open,
  onOpenChange,
  projectId,
  pages = [],
  field = 'both',
  onComplete
}) {
  const [step, setStep] = useState('select')
  const [selectedPageIds, setSelectedPageIds] = useState(new Set())
  const [selectedField, setSelectedField] = useState(field === 'both' ? 'title' : field)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generatedSuggestions, setGeneratedSuggestions] = useState({})
  const [editedSuggestions, setEditedSuggestions] = useState({})
  const [approvedIds, setApprovedIds] = useState(new Set())
  const [rejectedIds, setRejectedIds] = useState(new Set())
  const [isApplying, setIsApplying] = useState(false)
  const [applyProgress, setApplyProgress] = useState(0)
  const [results, setResults] = useState({ success: 0, failed: 0 })

  // Ensure pages is always an array (handles raw API shape)
  const pageList = Array.isArray(pages) ? pages : (pages?.pages ?? [])

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep('select')
      setSelectedPageIds(new Set())
      setGeneratedSuggestions({})
      setEditedSuggestions({})
      setApprovedIds(new Set())
      setRejectedIds(new Set())
      setGenerationProgress(0)
      setApplyProgress(0)
      setResults({ success: 0, failed: 0 })
    }
  }, [open])

  // Filter pages that need optimization for the selected field (use pageList for array safety)
  const pagesNeedingOptimization = pageList.filter(page => {
    if (selectedField === 'title') {
      return !page.title || page.title.length < 10 || page.title.length > 60
    }
    if (selectedField === 'meta_description') {
      return !page.meta_description || page.meta_description.length < 50 || page.meta_description.length > 160
    }
    return true
  })

  // Toggle page selection
  const togglePage = (pageId) => {
    const newSelected = new Set(selectedPageIds)
    if (newSelected.has(pageId)) {
      newSelected.delete(pageId)
    } else {
      newSelected.add(pageId)
    }
    setSelectedPageIds(newSelected)
  }

  // Select all pages
  const selectAll = () => {
    setSelectedPageIds(new Set(pagesNeedingOptimization.map(p => p.id)))
  }

  // Deselect all
  const deselectAll = () => {
    setSelectedPageIds(new Set())
  }

  // Generate AI suggestions for all selected pages
  const generateSuggestions = async () => {
    setIsGenerating(true)
    setGenerationProgress(0)
    const suggestions = {}
    const selectedPages = pageList.filter(p => selectedPageIds.has(p.id))
    
    for (let i = 0; i < selectedPages.length; i++) {
      const page = selectedPages[i]
      try {
        // Call AI endpoint to generate suggestion
        const response = await seoApi.analyzePageWithAi(projectId, page.id)
        const aiData = response.data
        
        suggestions[page.id] = {
          original: selectedField === 'title' ? page.title : page.meta_description,
          suggested: selectedField === 'title' 
            ? aiData.suggested_title || aiData.title_suggestions?.[0]
            : aiData.suggested_meta_description || aiData.meta_suggestions?.[0],
          confidence: aiData.confidence || 0.8,
          reasoning: aiData.reasoning || 'AI-optimized for better click-through rate'
        }
      } catch (error) {
        console.error(`Failed to generate for page ${page.id}:`, error)
        suggestions[page.id] = {
          original: selectedField === 'title' ? page.title : page.meta_description,
          suggested: null,
          error: error.message
        }
      }
      
      setGenerationProgress(((i + 1) / selectedPages.length) * 100)
    }
    
    setGeneratedSuggestions(suggestions)
    setEditedSuggestions(suggestions)
    // Auto-approve all successful generations
    const autoApproved = new Set(
      Object.entries(suggestions)
        .filter(([_, s]) => s.suggested && !s.error)
        .map(([id]) => id)
    )
    setApprovedIds(autoApproved)
    setIsGenerating(false)
    setStep('review')
  }

  // Toggle approval for a suggestion
  const toggleApproval = (pageId) => {
    const newApproved = new Set(approvedIds)
    const newRejected = new Set(rejectedIds)
    
    if (newApproved.has(pageId)) {
      newApproved.delete(pageId)
      newRejected.add(pageId)
    } else if (newRejected.has(pageId)) {
      newRejected.delete(pageId)
    } else {
      newApproved.add(pageId)
    }
    
    setApprovedIds(newApproved)
    setRejectedIds(newRejected)
  }

  // Edit a suggestion
  const editSuggestion = (pageId, newValue) => {
    setEditedSuggestions(prev => ({
      ...prev,
      [pageId]: {
        ...prev[pageId],
        suggested: newValue,
        edited: true
      }
    }))
  }

  // Regenerate single suggestion
  const regenerateSingle = async (pageId) => {
    const page = pageList.find(p => p.id === pageId)
    if (!page) return
    
    try {
      const response = await seoApi.analyzePageWithAi(projectId, pageId)
      const aiData = response.data
      
      setEditedSuggestions(prev => ({
        ...prev,
        [pageId]: {
          original: selectedField === 'title' ? page.title : page.meta_description,
          suggested: selectedField === 'title' 
            ? aiData.suggested_title || aiData.title_suggestions?.[0]
            : aiData.suggested_meta_description || aiData.meta_suggestions?.[0],
          confidence: aiData.confidence || 0.8,
          reasoning: aiData.reasoning,
          regenerated: true
        }
      }))
      
      // Auto-approve regenerated
      setApprovedIds(prev => new Set([...prev, pageId]))
      setRejectedIds(prev => {
        const next = new Set(prev)
        next.delete(pageId)
        return next
      })
    } catch (error) {
      toast.error(`Failed to regenerate: ${error.message}`)
    }
  }

  // Apply approved changes
  const applyChanges = async () => {
    setIsApplying(true)
    setApplyProgress(0)
    
    const toApply = Array.from(approvedIds)
    let success = 0
    let failed = 0
    
    for (let i = 0; i < toApply.length; i++) {
      const pageId = toApply[i]
      const suggestion = editedSuggestions[pageId]
      
      if (!suggestion?.suggested) {
        failed++
        continue
      }
      
      try {
        const updateData = selectedField === 'title' 
          ? { title: suggestion.suggested }
          : { meta_description: suggestion.suggested }
        
        await seoApi.updatePage(pageId, updateData)
        
        // Also record in change history
        await seoApi.createChangeHistory(projectId, {
          page_id: pageId,
          change_type: selectedField,
          field_name: selectedField,
          old_value: suggestion.original || '',
          new_value: suggestion.suggested,
          source: 'bulk_edit',
          notes: `Bulk edit: ${toApply.length} pages updated`
        })
        
        success++
      } catch (error) {
        console.error(`Failed to update page ${pageId}:`, error)
        failed++
      }
      
      setApplyProgress(((i + 1) / toApply.length) * 100)
    }
    
    setResults({ success, failed })
    setIsApplying(false)
    setStep('apply')
    
    if (success > 0) {
      toast.success(`Successfully updated ${success} pages`)
      onComplete?.({ success, failed })
    }
  }

  // Step navigation
  const canProceed = () => {
    switch (step) {
      case 'select':
        return selectedPageIds.size > 0
      case 'generate':
        return Object.keys(generatedSuggestions).length > 0
      case 'review':
        return approvedIds.size > 0
      default:
        return false
    }
  }

  const goNext = () => {
    if (step === 'select') {
      generateSuggestions()
    } else if (step === 'review') {
      applyChanges()
    }
  }

  const goBack = () => {
    if (step === 'review') setStep('select')
    if (step === 'apply') {
      setStep('review')
      setApplyProgress(0)
    }
  }

  const fieldConfig = FIELD_CONFIG[selectedField]
  const FieldIcon = fieldConfig?.icon || Type

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-[var(--accent-primary)]" />
            Bulk Signal Edit
          </DialogTitle>
          <DialogDescription>
            Generate and apply Signal-optimized {fieldConfig?.label || 'content'} for multiple pages at once
          </DialogDescription>
        </DialogHeader>

        {/* Step Progress */}
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--glass-bg)] rounded-lg mb-4">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full',
                step === s.id 
                  ? 'bg-[var(--accent-primary)] text-white'
                  : STEPS.findIndex(x => x.id === step) > i
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-[var(--glass-bg-subtle)] text-[var(--text-tertiary)]'
              )}>
                <s.icon className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 mx-2 text-[var(--text-tertiary)]" />
              )}
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* Step 1: Select Pages */}
            {step === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col"
              >
                {/* Field selector */}
                {field === 'both' && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-[var(--text-secondary)]">Optimize:</span>
                    <Tabs value={selectedField} onValueChange={setSelectedField}>
                      <TabsList>
                        <TabsTrigger value="title">
                          <Type className="h-4 w-4 mr-1" />
                          Titles
                        </TabsTrigger>
                        <TabsTrigger value="meta_description">
                          <FileText className="h-4 w-4 mr-1" />
                          Descriptions
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                )}

                {/* Selection controls */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      Select All ({pagesNeedingOptimization.length})
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAll}>
                      Clear
                    </Button>
                  </div>
                  <Badge variant="outline">
                    {selectedPageIds.size} selected
                  </Badge>
                </div>

                {/* Page list */}
                <ScrollArea className="flex-1 -mx-6 px-6">
                  <div className="space-y-2">
                    {pagesNeedingOptimization.map(page => (
                      <div
                        key={page.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                          selectedPageIds.has(page.id)
                            ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/50'
                            : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:border-[var(--accent-primary)]/30'
                        )}
                        onClick={() => togglePage(page.id)}
                      >
                        <Checkbox checked={selectedPageIds.has(page.id)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {page.url}
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)] truncate">
                            Current: {selectedField === 'title' ? page.title || '(no title)' : page.meta_description || '(no description)'}
                          </p>
                        </div>
                        {selectedField === 'title' && page.title && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              'text-xs',
                              page.title.length > 60 ? 'text-red-400 border-red-500/30' :
                              page.title.length < 30 ? 'text-yellow-400 border-yellow-500/30' :
                              'text-green-400 border-green-500/30'
                            )}
                          >
                            {page.title.length}/60
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </motion.div>
            )}

            {/* Step 2: Generating (shown during generation) */}
            {(step === 'select' && isGenerating) && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-64"
              >
                <Loader2 className="h-12 w-12 animate-spin text-[var(--accent-primary)] mb-4" />
                <h3 className="text-lg font-medium mb-2">Generating AI Suggestions</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Processing {selectedPageIds.size} pages...
                </p>
                <Progress value={generationProgress} className="w-64" />
                <span className="text-xs text-[var(--text-tertiary)] mt-2">
                  {Math.round(generationProgress)}% complete
                </span>
              </motion.div>
            )}

            {/* Step 3: Review */}
            {step === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col"
              >
                {/* Review summary */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <Badge className="bg-green-500/20 text-green-400">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {approvedIds.size} approved
                    </Badge>
                    <Badge className="bg-red-500/20 text-red-400">
                      <XCircle className="h-3 w-3 mr-1" />
                      {rejectedIds.size} rejected
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setApprovedIds(new Set(Object.keys(editedSuggestions)))}>
                    Approve All
                  </Button>
                </div>

                {/* Suggestions list */}
                <ScrollArea className="flex-1 -mx-6 px-6">
                  <div className="space-y-4">
                    {Array.from(selectedPageIds).map(pageId => {
                      const page = pages.find(p => p.id === pageId)
                      const suggestion = editedSuggestions[pageId]
                      const isApproved = approvedIds.has(pageId)
                      const isRejected = rejectedIds.has(pageId)
                      
                      if (!page || !suggestion) return null
                      
                      return (
                        <Card
                          key={pageId}
                          className={cn(
                            'border transition-all',
                            isApproved 
                              ? 'border-green-500/50 bg-green-500/5'
                              : isRejected
                                ? 'border-red-500/50 bg-red-500/5 opacity-60'
                                : 'border-[var(--glass-border)]'
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                  {page.url}
                                </p>
                                {suggestion.error && (
                                  <p className="text-xs text-red-400 mt-1">
                                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                                    {suggestion.error}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => regenerateSingle(pageId)}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant={isApproved ? 'default' : 'outline'}
                                  size="sm"
                                  className={isApproved ? 'bg-green-600' : ''}
                                  onClick={() => toggleApproval(pageId)}
                                >
                                  {isApproved ? <Check className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                                </Button>
                                <Button
                                  variant={isRejected ? 'destructive' : 'outline'}
                                  size="sm"
                                  onClick={() => {
                                    if (!isRejected) {
                                      setRejectedIds(prev => new Set([...prev, pageId]))
                                      setApprovedIds(prev => {
                                        const next = new Set(prev)
                                        next.delete(pageId)
                                        return next
                                      })
                                    }
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Before/After */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs text-red-400 block mb-1">Current</label>
                                <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-sm text-[var(--text-secondary)]">
                                  {suggestion.original || '(empty)'}
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-green-400 block mb-1">
                                  AI Suggestion
                                  {suggestion.edited && <span className="ml-1">(edited)</span>}
                                </label>
                                {selectedField === 'meta_description' ? (
                                  <Textarea
                                    value={suggestion.suggested || ''}
                                    onChange={(e) => editSuggestion(pageId, e.target.value)}
                                    className="bg-green-500/10 border-green-500/20 text-sm"
                                    rows={3}
                                  />
                                ) : (
                                  <Input
                                    value={suggestion.suggested || ''}
                                    onChange={(e) => editSuggestion(pageId, e.target.value)}
                                    className="bg-green-500/10 border-green-500/20 text-sm"
                                  />
                                )}
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-[var(--text-tertiary)]">
                                    {suggestion.reasoning}
                                  </span>
                                  <span className={cn(
                                    'text-xs',
                                    (suggestion.suggested?.length || 0) > (fieldConfig?.maxLength || 60)
                                      ? 'text-red-400'
                                      : 'text-green-400'
                                  )}>
                                    {suggestion.suggested?.length || 0}/{fieldConfig?.maxLength || 60}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </ScrollArea>
              </motion.div>
            )}

            {/* Step 4: Apply Results */}
            {step === 'apply' && (
              <motion.div
                key="apply"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-64"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="h-12 w-12 animate-spin text-[var(--accent-primary)] mb-4" />
                    <h3 className="text-lg font-medium mb-2">Applying Changes</h3>
                    <Progress value={applyProgress} className="w-64" />
                    <span className="text-xs text-[var(--text-tertiary)] mt-2">
                      {Math.round(applyProgress)}% complete
                    </span>
                  </>
                ) : (
                  <>
                    <div className={cn(
                      'w-16 h-16 rounded-full flex items-center justify-center mb-4',
                      results.failed === 0 ? 'bg-green-500/20' : 'bg-yellow-500/20'
                    )}>
                      {results.failed === 0 ? (
                        <CheckCircle2 className="h-8 w-8 text-green-400" />
                      ) : (
                        <AlertTriangle className="h-8 w-8 text-yellow-400" />
                      )}
                    </div>
                    <h3 className="text-lg font-medium mb-2">Bulk Edit Complete</h3>
                    <div className="flex items-center gap-4 mb-4">
                      <Badge className="bg-green-500/20 text-green-400">
                        {results.success} succeeded
                      </Badge>
                      {results.failed > 0 && (
                        <Badge className="bg-red-500/20 text-red-400">
                          {results.failed} failed
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Changes have been recorded in the action history
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between border-t border-[var(--glass-border)] pt-4">
          <div>
            {step !== 'select' && step !== 'apply' && (
              <Button variant="ghost" onClick={goBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {step === 'apply' ? 'Close' : 'Cancel'}
            </Button>
            {step !== 'apply' && (
              <Button
                onClick={goNext}
                disabled={!canProceed() || isGenerating || isApplying}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : step === 'review' ? (
                  <>
                    Apply {approvedIds.size} Changes
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    Generate AI
                    <Sparkles className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
