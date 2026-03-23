// src/components/signal/SignalLearningDashboard.jsx
// Learning suggestions dashboard - review, approve, apply, reject, defer AI suggestions
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Lightbulb,
  Check,
  X,
  Clock,
  Play,
  Pause,
  Sparkles,
  TrendingUp,
  MessageSquare,
  UserPlus,
  FileText,
  AlertCircle,
  ChevronRight,
  Filter,
  Loader2,
  RefreshCw,
  Eye,
  ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { useSignalStore } from '@/lib/signal-store' // Keep for streaming UI state
import { useSignalSuggestions, signalKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

// Suggestion type configuration
const SUGGESTION_TYPES = {
  faq: { 
    label: 'New FAQ', 
    icon: MessageSquare, 
    color: 'text-blue-400', 
    bg: 'bg-blue-500/20',
    description: 'Suggested FAQ from conversation patterns'
  },
  profile_update: { 
    label: 'Profile Update', 
    icon: UserPlus, 
    color: 'text-purple-400', 
    bg: 'bg-purple-500/20',
    description: 'Update to client profile snapshot'
  },
  knowledge_gap: { 
    label: 'Knowledge Gap', 
    icon: Brain, 
    color: 'text-orange-400', 
    bg: 'bg-orange-500/20',
    description: 'Missing knowledge identified from questions'
  },
  improvement: { 
    label: 'Improvement', 
    icon: TrendingUp, 
    color: 'text-emerald-400', 
    bg: 'bg-emerald-500/20',
    description: 'Suggested content or response improvement'
  }
}

// Status configuration
const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  approved: { label: 'Approved', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  applied: { label: 'Applied', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  rejected: { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-500/20' },
  deferred: { label: 'Deferred', color: 'text-gray-400', bg: 'bg-gray-500/20' }
}

export default function SignalLearningDashboard({ projectId, className }) {
  const {
    suggestions,
    suggestionsLoading,
    suggestionsPagination,
    suggestionsStats,
    fetchSuggestions,
    approveSuggestion,
    applySuggestion,
    rejectSuggestion,
    deferSuggestion
  } = useSignalStore()

  const [activeTab, setActiveTab] = useState('pending')
  const [typeFilter, setTypeFilter] = useState('all')
  const [previewSuggestion, setPreviewSuggestion] = useState(null)
  const [actionLoading, setActionLoading] = useState({})

  // Fetch suggestions on mount and when filters change
  useEffect(() => {
    if (projectId) {
      fetchSuggestions(projectId, {
        status: activeTab !== 'all' ? activeTab : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined
      })
    }
  }, [projectId, activeTab, typeFilter])

  const handleAction = async (suggestionId, action) => {
    setActionLoading(prev => ({ ...prev, [suggestionId]: action }))
    try {
      switch (action) {
        case 'approve':
          await approveSuggestion(projectId, suggestionId)
          break
        case 'apply':
          await applySuggestion(projectId, suggestionId)
          break
        case 'reject':
          await rejectSuggestion(projectId, suggestionId)
          break
        case 'defer':
          await deferSuggestion(projectId, suggestionId)
          break
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [suggestionId]: null }))
      setPreviewSuggestion(null)
    }
  }

  const stats = suggestionsStats || { byStatus: {}, byType: {} }
  const pendingCount = stats.byStatus?.pending || 0
  const approvedCount = stats.byStatus?.approved || 0
  const appliedCount = stats.byStatus?.applied || 0

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/20">
              <Lightbulb className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <CardTitle>Learning Suggestions</CardTitle>
              <CardDescription>
                AI-generated improvements based on conversation patterns
              </CardDescription>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={() => fetchSuggestions(projectId, { status: activeTab !== 'all' ? activeTab : undefined })}
            disabled={suggestionsLoading}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', suggestionsLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <StatCard
            label="Pending Review"
            value={pendingCount}
            icon={Clock}
            color="text-yellow-400"
            bg="bg-yellow-500/20"
          />
          <StatCard
            label="Approved"
            value={approvedCount}
            icon={Check}
            color="text-blue-400"
            bg="bg-blue-500/20"
          />
          <StatCard
            label="Applied"
            value={appliedCount}
            icon={Sparkles}
            color="text-emerald-400"
            bg="bg-emerald-500/20"
          />
        </div>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Pending
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-yellow-500/20 text-yellow-400">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="applied">Applied</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(SUGGESTION_TYPES).map(([type, config]) => (
                <SelectItem key={type} value={type}>
                  <span className="flex items-center gap-2">
                    <config.icon className={cn('h-4 w-4', config.color)} />
                    {config.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Suggestions list */}
        <div className="min-h-[400px]">
          {suggestionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : suggestions.length === 0 ? (
            <EmptyState status={activeTab} />
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              <AnimatePresence>
                {suggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onPreview={() => setPreviewSuggestion(suggestion)}
                    onApprove={() => handleAction(suggestion.id, 'approve')}
                    onApply={() => handleAction(suggestion.id, 'apply')}
                    onReject={() => handleAction(suggestion.id, 'reject')}
                    onDefer={() => handleAction(suggestion.id, 'defer')}
                    actionLoading={actionLoading[suggestion.id]}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Pagination */}
        {suggestionsPagination?.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              disabled={suggestionsPagination.page <= 1}
              onClick={() => fetchSuggestions(projectId, { 
                page: suggestionsPagination.page - 1,
                status: activeTab !== 'all' ? activeTab : undefined
              })}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {suggestionsPagination.page} of {suggestionsPagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={suggestionsPagination.page >= suggestionsPagination.pages}
              onClick={() => fetchSuggestions(projectId, { 
                page: suggestionsPagination.page + 1,
                status: activeTab !== 'all' ? activeTab : undefined
              })}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>

      {/* Preview Dialog */}
      <Dialog open={!!previewSuggestion} onOpenChange={() => setPreviewSuggestion(null)}>
        <DialogContent className="max-w-2xl">
          {previewSuggestion && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const typeConfig = SUGGESTION_TYPES[previewSuggestion.suggestion_type] || SUGGESTION_TYPES.improvement
                    return (
                      <Badge className={cn('gap-1', typeConfig.bg, typeConfig.color)}>
                        <typeConfig.icon className="h-3 w-3" />
                        {typeConfig.label}
                      </Badge>
                    )
                  })()}
                  <Badge variant="secondary" className={cn(
                    STATUS_CONFIG[previewSuggestion.status]?.bg,
                    STATUS_CONFIG[previewSuggestion.status]?.color
                  )}>
                    {STATUS_CONFIG[previewSuggestion.status]?.label}
                  </Badge>
                </div>
                <DialogTitle>Review Suggestion</DialogTitle>
                <DialogDescription>
                  Confidence: {previewSuggestion.confidence}%
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Confidence indicator */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">AI Confidence</span>
                    <span className={cn(
                      previewSuggestion.confidence >= 80 ? 'text-emerald-400' :
                      previewSuggestion.confidence >= 60 ? 'text-yellow-400' : 'text-red-400'
                    )}>
                      {previewSuggestion.confidence}%
                    </span>
                  </div>
                  <Progress value={previewSuggestion.confidence} className="h-2" />
                </div>

                {/* Suggestion content */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Suggested Content</Label>
                  <div className="p-4 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">
                    {typeof previewSuggestion.content === 'string' 
                      ? previewSuggestion.content
                      : JSON.stringify(previewSuggestion.content, null, 2)}
                  </div>
                </div>

                {/* Reasoning */}
                {previewSuggestion.reasoning && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Why Signal Suggested This</Label>
                    <p className="text-sm">{previewSuggestion.reasoning}</p>
                  </div>
                )}

                {/* Source context */}
                {previewSuggestion.source_context && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Source Context</Label>
                    <p className="text-sm text-muted-foreground">{previewSuggestion.source_context}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                {previewSuggestion.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleAction(previewSuggestion.id, 'defer')}
                      disabled={!!actionLoading[previewSuggestion.id]}
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Defer
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAction(previewSuggestion.id, 'reject')}
                      disabled={!!actionLoading[previewSuggestion.id]}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleAction(previewSuggestion.id, 'apply')}
                      disabled={!!actionLoading[previewSuggestion.id]}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {actionLoading[previewSuggestion.id] === 'apply' ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Apply Now
                    </Button>
                  </>
                )}
                {previewSuggestion.status === 'approved' && (
                  <Button
                    onClick={() => handleAction(previewSuggestion.id, 'apply')}
                    disabled={!!actionLoading[previewSuggestion.id]}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {actionLoading[previewSuggestion.id] === 'apply' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Apply
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// Stat card component
function StatCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="p-4 rounded-lg border bg-[var(--glass-bg)]">
      <div className="flex items-center gap-3">
        <div className={cn('flex items-center justify-center w-10 h-10 rounded-full', bg)}>
          <Icon className={cn('h-5 w-5', color)} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}

// Label component for dialog
function Label({ children, className }) {
  return (
    <label className={cn('text-sm font-medium', className)}>
      {children}
    </label>
  )
}

// Suggestion card component
function SuggestionCard({ 
  suggestion, 
  onPreview, 
  onApprove, 
  onApply, 
  onReject, 
  onDefer,
  actionLoading 
}) {
  const typeConfig = SUGGESTION_TYPES[suggestion.suggestion_type] || SUGGESTION_TYPES.improvement
  const statusConfig = STATUS_CONFIG[suggestion.status] || STATUS_CONFIG.pending
  const isPending = suggestion.status === 'pending'
  const isApproved = suggestion.status === 'approved'

  const confidenceColor = 
    suggestion.confidence >= 80 ? 'text-emerald-400' :
    suggestion.confidence >= 60 ? 'text-yellow-400' : 'text-orange-400'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={cn(
        'p-4 rounded-lg border transition-colors cursor-pointer',
        'bg-[var(--glass-bg)] hover:bg-accent/5',
        isPending && 'border-purple-500/30'
      )}
      onClick={onPreview}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex items-center justify-center w-10 h-10 rounded-full shrink-0',
          typeConfig.bg
        )}>
          <typeConfig.icon className={cn('h-5 w-5', typeConfig.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className={cn('text-xs', typeConfig.bg, typeConfig.color)}>
              {typeConfig.label}
            </Badge>
            <Badge variant="secondary" className={cn('text-xs', statusConfig.bg, statusConfig.color)}>
              {statusConfig.label}
            </Badge>
            <span className={cn('text-xs font-medium', confidenceColor)}>
              {suggestion.confidence}% confident
            </span>
          </div>

          <p className="text-sm text-foreground line-clamp-2">
            {typeof suggestion.content === 'string' 
              ? suggestion.content.substring(0, 150) + (suggestion.content.length > 150 ? '...' : '')
              : typeConfig.description}
          </p>

          {suggestion.reasoning && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {suggestion.reasoning}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(suggestion.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          {(isPending || isApproved) && (
            <>
              {isPending && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onReject}
                          disabled={!!actionLoading}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                        >
                          {actionLoading === 'reject' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reject</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onDefer}
                          disabled={!!actionLoading}
                          className="text-gray-400 hover:text-gray-300"
                        >
                          {actionLoading === 'defer' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Pause className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Defer</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onApply}
                      disabled={!!actionLoading}
                      className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20"
                    >
                      {actionLoading === 'apply' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Apply Now</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}

          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </motion.div>
  )
}

// Empty state component
function EmptyState({ status }) {
  const messages = {
    pending: {
      title: 'No pending suggestions',
      description: 'Signal will suggest improvements as it learns from conversations'
    },
    approved: {
      title: 'No approved suggestions',
      description: 'Suggestions you approve will appear here before being applied'
    },
    applied: {
      title: 'No applied suggestions',
      description: 'Applied improvements will be logged here'
    },
    all: {
      title: 'No suggestions yet',
      description: 'Signal will generate suggestions as it handles conversations'
    }
  }

  const msg = messages[status] || messages.all

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <Lightbulb className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium mb-1">{msg.title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{msg.description}</p>
    </div>
  )
}
