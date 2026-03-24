/**
 * ProspectEmailsWithSignal - Gmail integration with Signal AI insights
 * 
 * Features:
 * - Syncs Gmail threads to cache for AI analysis
 * - Shows email threads with sentiment and insights
 * - Smart reply suggestions powered by Signal
 * - One-click compose with AI-drafted responses
 */
import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Mail,
  Loader2,
  RefreshCw,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Zap,
  Brain,
  Send,
  Copy,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { GlassCard, GlassEmptyState, SentimentBadge, StatusBadge } from './ui'
import SignalIcon from '@/components/ui/SignalIcon'
import portalApi from '@/lib/sonor-api'
import { crmAiApi } from '@/lib/signal-api'
import { toast } from 'sonner'

// Sentiment color mapping
const sentimentColors = {
  positive: { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/30' },
  negative: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/30' },
  neutral: { bg: 'bg-gray-500/10', text: 'text-gray-600', border: 'border-gray-500/30' },
  frustrated: { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/30' },
  interested: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' },
  urgent: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/30' },
}

// Urgency level badges
function UrgencyBadge({ level }) {
  const config = {
    high: { variant: 'destructive', label: 'Urgent' },
    medium: { variant: 'warning', label: 'Medium' },
    low: { variant: 'secondary', label: 'Low' },
    normal: { variant: 'outline', label: 'Normal' }
  }
  const cfg = config[level] || config.normal
  return <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
}

// Single email message display
function EmailMessage({ message, isLast }) {
  const [isExpanded, setIsExpanded] = useState(isLast)
  const isOutbound = message.direction === 'outbound'
  
  return (
    <div className={cn(
      'relative pl-8 pb-4',
      !isLast && 'border-l-2 border-[var(--glass-border)] ml-4'
    )}>
      {/* Timeline dot */}
      <div className={cn(
        'absolute left-0 top-0 w-4 h-4 rounded-full -translate-x-1/2',
        isOutbound ? 'bg-[var(--brand-primary)]' : 'bg-blue-500'
      )}>
        {isOutbound ? (
          <ArrowUpRight className="h-2.5 w-2.5 text-white absolute top-0.5 left-0.5" />
        ) : (
          <ArrowDownLeft className="h-2.5 w-2.5 text-white absolute top-0.5 left-0.5" />
        )}
      </div>
      
      <GlassCard 
        padding="sm" 
        className={cn(
          'cursor-pointer transition-all',
          isExpanded && 'ring-1 ring-[var(--brand-primary)]/20'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {isOutbound ? 'You' : (message.from_name || message.from_email)}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">
                {new Date(message.gmail_date).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
              {isExpanded ? null : (message.snippet || message.body_text?.slice(0, 150))}
            </p>
            
            {isExpanded && (
              <div className="mt-3 text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                {message.body_text || message.snippet}
              </div>
            )}
          </div>
          <ChevronRight className={cn(
            'h-4 w-4 text-[var(--text-tertiary)] transition-transform',
            isExpanded && 'rotate-90'
          )} />
        </div>
      </GlassCard>
    </div>
  )
}

// Thread with AI insights
function ThreadWithInsights({ 
  thread, 
  insights, 
  isLoadingInsights,
  onAnalyze,
  onGenerateReplies,
  onComposeWithSuggestion,
  brandColors
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [replySuggestions, setReplySuggestions] = useState(null)
  const [isLoadingReplies, setIsLoadingReplies] = useState(false)
  
  const hasInsights = insights && !isLoadingInsights
  const sentiment = insights?.sentiment || 'neutral'
  const sentimentStyle = sentimentColors[sentiment] || sentimentColors.neutral
  
  const handleGetReplies = async () => {
    setIsLoadingReplies(true)
    try {
      const suggestions = await onGenerateReplies(thread.thread_id, thread.messages)
      setReplySuggestions(suggestions)
    } catch (err) {
      toast.error('Failed to generate reply suggestions')
    } finally {
      setIsLoadingReplies(false)
    }
  }
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <GlassCard 
        padding="md"
        className={cn(
          'transition-all',
          isOpen && 'ring-1',
          hasInsights && sentimentStyle.border
        )}
      >
        {/* Thread Header */}
        <CollapsibleTrigger className="w-full">
          <div className="flex items-start gap-3">
            <div className={cn(
              'p-2 rounded-xl',
              hasInsights ? sentimentStyle.bg : 'bg-[var(--glass-bg-inset)]'
            )}>
              <Mail className={cn(
                'h-4 w-4',
                hasInsights ? sentimentStyle.text : 'text-[var(--text-tertiary)]'
              )} />
            </div>
            
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">
                  {thread.messages?.[0]?.subject || 'No Subject'}
                </span>
                <Badge variant="outline" className="text-xs">
                  {thread.messages?.length || 0} messages
                </Badge>
              </div>
              
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Last activity: {new Date(thread.messages?.[thread.messages.length - 1]?.gmail_date).toLocaleDateString()}
              </p>
              
              {/* Quick insights preview */}
              {hasInsights && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <SentimentBadge sentiment={sentiment} size="sm" />
                  {insights.urgency_level && insights.urgency_level !== 'normal' && (
                    <UrgencyBadge level={insights.urgency_level} />
                  )}
                  {insights.action_items?.length > 0 && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {insights.action_items.length} action items
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            <ChevronRight className={cn(
              'h-4 w-4 text-[var(--text-tertiary)] transition-transform',
              isOpen && 'rotate-90'
            )} />
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
            {/* AI Insights Panel */}
            {hasInsights && (
              <div className="mb-4 p-3 rounded-xl bg-[var(--glass-bg-inset)]">
                <div className="flex items-center gap-2 mb-3">
                  <SignalIcon className="h-4 w-4" style={{ color: brandColors?.primary }} />
                  <span className="text-sm font-medium">Signal Insights</span>
                </div>
                
                {/* Summary */}
                {insights.thread_summary && (
                  <p className="text-sm text-[var(--text-secondary)] mb-3">
                    {insights.thread_summary}
                  </p>
                )}
                
                {/* Key Topics */}
                {insights.key_topics?.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs text-[var(--text-tertiary)]">Key Topics:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {insights.key_topics.map((topic, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Action Items */}
                {insights.action_items?.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs text-[var(--text-tertiary)]">Action Items:</span>
                    <ul className="mt-1 space-y-1">
                      {insights.action_items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--brand-primary)] mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Next Best Action */}
                {insights.next_best_action && (
                  <div className="p-2 rounded-lg bg-[var(--brand-primary)]/10 flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 mt-0.5" style={{ color: brandColors?.primary }} />
                    <div>
                      <span className="text-xs font-medium" style={{ color: brandColors?.primary }}>
                        Recommended Next Step
                      </span>
                      <p className="text-sm">{insights.next_best_action}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Messages Timeline */}
            <div className="space-y-0">
              {thread.messages?.map((message, idx) => (
                <EmailMessage 
                  key={message.gmail_message_id || idx} 
                  message={message}
                  isLast={idx === thread.messages.length - 1}
                />
              ))}
            </div>
            
            {/* Smart Reply Section */}
            <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" style={{ color: brandColors?.primary }} />
                  <span className="text-sm font-medium">Smart Replies</span>
                </div>
                
                {!replySuggestions && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGetReplies}
                    disabled={isLoadingReplies}
                    className="gap-1.5"
                  >
                    {isLoadingReplies ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    Generate Replies
                  </Button>
                )}
              </div>
              
              {replySuggestions?.length > 0 && (
                <div className="space-y-2">
                  {replySuggestions.map((suggestion, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-xl bg-[var(--glass-bg-inset)] border border-[var(--glass-border)]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {suggestion.type?.replace('_', ' ') || 'Reply'}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7"
                                onClick={() => {
                                  navigator.clipboard.writeText(suggestion.content)
                                  toast.success('Copied to clipboard')
                                }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy</TooltipContent>
                          </Tooltip>
                          <Button 
                            size="sm"
                            className="h-7 gap-1"
                            style={{ backgroundColor: brandColors?.primary }}
                            onClick={() => onComposeWithSuggestion?.(suggestion.content, thread)}
                          >
                            <Send className="h-3 w-3" />
                            Use
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                        {suggestion.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              
              {!replySuggestions && !isLoadingReplies && (
                <p className="text-xs text-[var(--text-tertiary)] text-center py-4">
                  Click "Generate Replies" to get AI-powered response suggestions
                </p>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </GlassCard>
    </Collapsible>
  )
}

// Main component
export default function ProspectEmailsWithSignal({ 
  prospect, 
  onComposeEmail,
  brandColors 
}) {
  const [threads, setThreads] = useState([])
  const [insights, setInsights] = useState({}) // Map of threadId -> insights
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  // Sync emails from Gmail to cache
  const syncEmails = useCallback(async (forceRefresh = false) => {
    if (!prospect?.id) return
    
    setIsSyncing(true)
    try {
      const response = await portalApi.post(`/crm/gmail/prospects/${prospect.id}/sync`, null, {
        params: { forceRefresh: forceRefresh ? 'true' : 'false', maxThreads: 10 }
      })
      
      const syncResult = response.data || response
      
      if (syncResult.cached > 0) {
        toast.success(`Synced ${syncResult.cached} new emails`)
      }
      
      // Fetch cached emails grouped by thread
      await fetchCachedEmails()
      
      // Trigger analysis for any new threads
      if (syncResult.threads?.length > 0) {
        analyzeThreads(syncResult.threads)
      }
    } catch (err) {
      console.error('Failed to sync emails:', err)
      toast.error('Failed to sync emails from Gmail')
    } finally {
      setIsSyncing(false)
    }
  }, [prospect?.id])
  
  // Fetch cached emails from Portal API
  const fetchCachedEmails = useCallback(async () => {
    if (!prospect?.id) return
    
    try {
      const response = await portalApi.get(`/crm/gmail/prospects/${prospect.id}/cache`)
      const emails = response.data || response || []
      
      // Group by thread
      const threadMap = {}
      emails.forEach(email => {
        const threadId = email.gmail_thread_id
        if (!threadMap[threadId]) {
          threadMap[threadId] = {
            thread_id: threadId,
            messages: []
          }
        }
        threadMap[threadId].messages.push(email)
      })
      
      // Sort messages by date
      Object.values(threadMap).forEach(thread => {
        thread.messages.sort((a, b) => 
          new Date(a.gmail_date) - new Date(b.gmail_date)
        )
      })
      
      // Sort threads by most recent
      const sortedThreads = Object.values(threadMap).sort((a, b) => {
        const aDate = a.messages[a.messages.length - 1]?.gmail_date
        const bDate = b.messages[b.messages.length - 1]?.gmail_date
        return new Date(bDate) - new Date(aDate)
      })
      
      setThreads(sortedThreads)
    } catch (err) {
      console.error('Failed to fetch cached emails:', err)
    }
  }, [prospect?.id])
  
  // Fetch existing insights
  const fetchInsights = useCallback(async () => {
    if (!prospect?.id) return
    
    try {
      const response = await crmAiApi.getEmailInsights(prospect.id)
      const insightsList = response.data || response || []
      
      // Map by thread ID
      const insightsMap = {}
      insightsList.forEach(insight => {
        insightsMap[insight.gmail_thread_id] = insight
      })
      
      setInsights(insightsMap)
    } catch (err) {
      console.error('Failed to fetch insights:', err)
    }
  }, [prospect?.id])
  
  // Analyze threads with Signal
  const analyzeThreads = useCallback(async (threadsToAnalyze) => {
    if (!prospect?.id || threadsToAnalyze.length === 0) return
    
    setIsAnalyzing(true)
    try {
      // Analyze each thread
      for (const thread of threadsToAnalyze) {
        if (!thread.thread_id || !thread.messages?.length) continue
        
        const result = await crmAiApi.analyzeEmailThread(
          prospect.id,
          thread.thread_id,
          thread.messages
        )
        
        if (result) {
          setInsights(prev => ({
            ...prev,
            [thread.thread_id]: result.data || result
          }))
        }
      }
    } catch (err) {
      console.error('Failed to analyze threads:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }, [prospect?.id])
  
  // Generate reply suggestions
  const handleGenerateReplies = async (threadId, messages) => {
    const result = await crmAiApi.generateReplySuggestions(prospect.id, threadId, messages)
    return result?.data?.suggestions || result?.suggestions || []
  }
  
  // Handle compose with suggestion
  const handleComposeWithSuggestion = (content, thread) => {
    onComposeEmail?.({
      ...prospect,
      prefillBody: content,
      replyToThreadId: thread.thread_id,
      replySubject: `Re: ${thread.messages?.[0]?.subject || ''}`
    })
  }
  
  // Initial load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      await Promise.all([
        fetchCachedEmails(),
        fetchInsights()
      ])
      setIsLoading(false)
    }
    load()
  }, [fetchCachedEmails, fetchInsights])
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">
            Email Threads
          </h4>
          {threads.length > 0 && (
            <Badge variant="secondary">{threads.length}</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isAnalyzing && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
              <SignalIcon className="h-3.5 w-3.5 animate-pulse" style={{ color: brandColors?.primary }} />
              Analyzing...
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => syncEmails(true)}
            disabled={isSyncing}
            className="gap-1.5"
          >
            {isSyncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Sync Gmail
          </Button>
          <Button
            size="sm"
            onClick={() => onComposeEmail?.(prospect)}
            className="gap-1.5"
            style={{ backgroundColor: brandColors?.primary }}
          >
            <Mail className="h-3.5 w-3.5" />
            Compose
          </Button>
        </div>
      </div>
      
      {/* No email address warning */}
      {!prospect?.email && (
        <GlassCard padding="md" className="border-l-2 border-l-amber-500">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium">No email address</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Add an email address to this contact to sync Gmail threads.
              </p>
            </div>
          </div>
        </GlassCard>
      )}
      
      {/* Thread list */}
      {threads.length === 0 ? (
        <GlassEmptyState
          icon={Mail}
          title="No email threads yet"
          description={
            prospect?.email 
              ? 'Click "Sync Gmail" to fetch email conversations with this contact'
              : 'Add an email address first'
          }
          size="md"
        >
          {prospect?.email && (
            <Button
              size="sm"
              onClick={() => syncEmails(false)}
              disabled={isSyncing}
              className="mt-4 gap-1.5"
              style={{ backgroundColor: brandColors?.primary }}
            >
              {isSyncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Sync from Gmail
            </Button>
          )}
        </GlassEmptyState>
      ) : (
        <div className="space-y-3">
          {threads.map(thread => (
            <ThreadWithInsights
              key={thread.thread_id}
              thread={thread}
              insights={insights[thread.thread_id]}
              isLoadingInsights={isAnalyzing}
              onAnalyze={() => analyzeThreads([thread])}
              onGenerateReplies={handleGenerateReplies}
              onComposeWithSuggestion={handleComposeWithSuggestion}
              brandColors={brandColors}
            />
          ))}
        </div>
      )}
    </div>
  )
}
