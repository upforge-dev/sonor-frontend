/**
 * SEO Bulk Pipeline Modal
 * 
 * Runs the Ashbound-style 9-phase SEO optimization pipeline for ALL pages.
 * Shows overall progress and individual page status.
 * 
 * WARNING: This can take a LONG time (30-60s per page).
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import {
  CheckCircle,
  Circle,
  Loader2,
  XCircle,
  AlertTriangle,
  Pause,
  Play,
  Clock,
  FileText,
  Rocket,
} from 'lucide-react'
import SignalIcon from '@/components/ui/SignalIcon'
import { signalSeoApi } from '@/lib/signal-api'
import { useSignalAccess } from '@/lib/signal-access'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Page status types
const PAGE_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETE: 'complete',
  FAILED: 'failed',
  SKIPPED: 'skipped',
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  return `${mins}m ${secs}s`
}

function PageRow({ page, status, duration, error }) {
  return (
    <div className={cn(
      "flex items-center gap-3 py-2 px-3 rounded-lg transition-colors",
      status === PAGE_STATUS.RUNNING && "bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)]",
      status === PAGE_STATUS.FAILED && "bg-red-500/10"
    )}>
      <div className="flex-shrink-0">
        {status === PAGE_STATUS.RUNNING ? (
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--brand-primary)' }} />
        ) : status === PAGE_STATUS.COMPLETE ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : status === PAGE_STATUS.FAILED ? (
          <XCircle className="h-4 w-4 text-red-500" />
        ) : status === PAGE_STATUS.SKIPPED ? (
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/30" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {page.path || page.url}
        </div>
        {error && (
          <div className="text-xs text-red-400 truncate">{error}</div>
        )}
      </div>
      {duration !== undefined && (
        <div className="text-xs text-muted-foreground">
          {formatDuration(duration)}
        </div>
      )}
    </div>
  )
}

export function SEOBulkPipelineModal({
  open,
  onOpenChange,
  projectId,
  pages = [],
  onComplete,
}) {
  const { hasAccess: hasSignalAccess } = useSignalAccess()
  
  // Normalize: API may return { pages: [...] } or a raw array
  const pagesList = Array.isArray(pages) ? pages : (pages?.pages ?? [])

  const [pageStatuses, setPageStatuses] = useState({})
  const [currentPageIndex, setCurrentPageIndex] = useState(-1)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [totalDuration, setTotalDuration] = useState(0)
  const abortRef = useRef(false)
  const pauseRef = useRef(false)

  const jobKey = `seo-bulk-pipeline-${projectId}`

  // Save job state to localStorage
  const saveJobState = useCallback(() => {
    if (hasStarted && !isComplete) {
      localStorage.setItem(jobKey, JSON.stringify({
        pageStatuses,
        currentPageIndex,
        isRunning,
        isPaused,
        hasStarted,
        totalDuration,
        timestamp: Date.now()
      }))
    }
  }, [jobKey, pageStatuses, currentPageIndex, isRunning, isPaused, hasStarted, totalDuration])

  // Clear job state from localStorage
  const clearJobState = useCallback(() => {
    localStorage.removeItem(jobKey)
  }, [jobKey])

  // Restore job state on mount
  useEffect(() => {
    const savedState = localStorage.getItem(jobKey)
    if (savedState && !hasStarted) {
      try {
        const state = JSON.parse(savedState)
        // Only restore if job was saved within last 24 hours
        if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
          setPageStatuses(state.pageStatuses || {})
          setCurrentPageIndex(state.currentPageIndex || -1)
          setIsRunning(false) // Don't auto-resume
          setIsPaused(true) // Start paused
          setHasStarted(state.hasStarted || false)
          setTotalDuration(state.totalDuration || 0)
          pauseRef.current = true
          
          // Re-open modal if job was running
          if (state.hasStarted && !open) {
            onOpenChange(true)
          }
        } else {
          // Job too old, clear it
          clearJobState()
        }
      } catch (e) {
        console.error('Failed to restore job state:', e)
        clearJobState()
      }
    }
  }, [jobKey, open, onOpenChange, clearJobState, hasStarted])

  // Save state when it changes
  useEffect(() => {
    saveJobState()
  }, [saveJobState])

  // Calculate progress
  const completedCount = Object.values(pageStatuses).filter(
    s => s.status === PAGE_STATUS.COMPLETE || s.status === PAGE_STATUS.FAILED || s.status === PAGE_STATUS.SKIPPED
  ).length
  const failedCount = Object.values(pageStatuses).filter(s => s.status === PAGE_STATUS.FAILED).length
  const progress = pagesList.length > 0 ? Math.round((completedCount / pagesList.length) * 100) : 0
  const isComplete = completedCount === pagesList.length && hasStarted

  // Reset state when modal closes (but keep in localStorage if incomplete)
  useEffect(() => {
    if (!open && isComplete) {
      clearJobState()
      setPageStatuses({})
      setCurrentPageIndex(-1)
      setIsRunning(false)
      setIsPaused(false)
      setHasStarted(false)
      setTotalDuration(0)
      abortRef.current = false
      pauseRef.current = false
    }
  }, [open, isComplete, clearJobState])

  // Estimate remaining time based on average duration
  const completedDurations = Object.values(pageStatuses)
    .filter(s => s.duration !== undefined)
    .map(s => s.duration)
  const avgDuration = completedDurations.length > 0 
    ? completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length 
    : 30000 // Default 30s estimate
  const remainingPages = pagesList.length - completedCount
  const estimatedRemaining = remainingPages * avgDuration

  // Process a single page
  const processPage = useCallback(async (page, index) => {
    setCurrentPageIndex(index)
    setPageStatuses(prev => ({
      ...prev,
      [page.id]: { status: PAGE_STATUS.RUNNING }
    }))

    const startTime = Date.now()

    try {
      // Run the pipeline for this page
      const result = await signalSeoApi.runPipeline(projectId, page.id, {})
      
      // Check if any phase failed
      const failedPhase = result.state?.phaseResults?.find(r => !r.ok)
      const hasFailed = !!failedPhase
      
      const duration = Date.now() - startTime
      setTotalDuration(prev => prev + duration)
      
      // Build detailed error message - check multiple sources
      let errorMsg = undefined
      if (hasFailed) {
        // Try error field first, then blockingIssues from data, then generic
        const blockingIssues = failedPhase.data?.blockingIssues?.join(', ')
        errorMsg = failedPhase.error || blockingIssues || `Phase ${failedPhase.phase} failed`
        console.error(`Pipeline failed for ${page.path}:`, failedPhase)
      }
      
      setPageStatuses(prev => ({
        ...prev,
        [page.id]: { 
          status: hasFailed ? PAGE_STATUS.FAILED : PAGE_STATUS.COMPLETE,
          duration,
          error: errorMsg
        }
      }))
    } catch (error) {
      const duration = Date.now() - startTime
      setTotalDuration(prev => prev + duration)
      
      setPageStatuses(prev => ({
        ...prev,
        [page.id]: { 
          status: PAGE_STATUS.FAILED,
          duration,
          error: error.message || 'Unknown error'
        }
      }))
    }
  }, [projectId])

  // Main processing loop
  const startProcessing = useCallback(async () => {
    setIsRunning(true)
    setHasStarted(true)
    abortRef.current = false
    pauseRef.current = false

    for (let i = 0; i < pagesList.length; i++) {
      // Check for abort
      if (abortRef.current) {
        break
      }

      // Check for pause
      while (pauseRef.current && !abortRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      if (abortRef.current) {
        break
      }

      // Skip already processed pages
      const pageStatus = pageStatuses[pagesList[i].id]
      if (pageStatus?.status === PAGE_STATUS.COMPLETE || pageStatus?.status === PAGE_STATUS.FAILED) {
        continue
      }

      await processPage(pagesList[i], i)
    }

    setIsRunning(false)
    setCurrentPageIndex(-1)
  }, [pagesList, pageStatuses, processPage])

  // Handle start button
  const handleStart = () => {
    startProcessing()
  }

  // Handle pause/resume
  const handlePauseResume = () => {
    if (isPaused) {
      pauseRef.current = false
      setIsPaused(false)
    } else {
      pauseRef.current = true
      setIsPaused(true)
    }
  }

  // Handle stop
  const handleStop = () => {
    abortRef.current = true
    pauseRef.current = false
    setIsPaused(false)
  }

  // Handle close
  const handleClose = () => {
    if (isRunning) {
      abortRef.current = true
    }
    
    // Clear job state if complete
    if (isComplete) {
      clearJobState()
      if (onComplete) {
        onComplete()
      }
    }
    
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
            Deep Optimize All Pages
            {hasStarted && !isRunning && isPaused && (
              <Badge variant="secondary" className="text-xs">
                Restored
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {hasStarted && !isRunning && isPaused ? (
              <>Resuming optimization for {pagesList.length} pages. Click Resume to continue.</>
            ) : (
              <>Running comprehensive 9-phase Signal optimization for {pagesList.length} pages.
              This may take {formatDuration(pagesList.length * 30000)} or more.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto flex flex-col gap-4 min-h-0">
          {/* Progress Overview */}
          <div className="space-y-3 flex-shrink-0">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span>
                {completedCount} / {pagesList.length} pages
              </span>
              {failedCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {failedCount} failed
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Elapsed: {formatDuration(totalDuration)}</span>
              </div>
              {isRunning && !isComplete && remainingPages > 0 && (
                <span>~{formatDuration(estimatedRemaining)} remaining</span>
              )}
            </div>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Page List */}
        <div className="flex-1 min-h-0 overflow-y-auto border rounded-lg">
          <div className="p-2 space-y-1">
            {pagesList.map((page, index) => (
              <PageRow
                key={page.id}
                page={page}
                status={pageStatuses[page.id]?.status || PAGE_STATUS.PENDING}
                duration={pageStatuses[page.id]?.duration}
                error={pageStatuses[page.id]?.error}
              />
            ))}
          </div>
        </div>

        {/* Status Message */}
        {isComplete && (
          <Card className={cn("flex-shrink-0", failedCount > 0 ? "border-yellow-500/30 bg-yellow-500/5" : "border-green-500/30 bg-green-500/5")}>
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                {failedCount > 0 ? (
                  <>
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    <div>
                      <div className="font-medium text-yellow-400">
                        Optimization completed with {failedCount} failures
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {completedCount - failedCount} pages optimized successfully
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <div>
                      <div className="font-medium text-green-400">
                        All pages optimized successfully!
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total time: {formatDuration(totalDuration)}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <DialogFooter className="flex-shrink-0 flex gap-2">
          {!hasStarted ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleStart}
                disabled={!hasSignalAccess}
                style={{ 
                  background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))'
                }}
                className="text-white"
              >
                <Rocket className="h-4 w-4 mr-2" />
                Start Optimization
              </Button>
            </>
          ) : isComplete ? (
            <Button onClick={handleClose}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Done
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={handleStop}
                disabled={!isRunning}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Stop
              </Button>
              <Button 
                variant="outline" 
                onClick={handlePauseResume}
                disabled={!isRunning}
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Run in Background
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SEOBulkPipelineModal
