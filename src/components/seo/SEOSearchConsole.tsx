// src/components/seo/SEOSearchConsole.tsx
// GSC Coverage & Indexing Health — the Search Console view
// Shows canonical vs indexed pages, issues, and auto-fix (Signal-powered)

import { useState, useMemo, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Globe, Search, CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  ChevronDown, ChevronRight, ExternalLink, Zap, Lock, ArrowRight,
  Loader2, Info, Shield, Link2, FileX, Bot, Eye, Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { useSignalAccess } from '@/lib/signal-access'
import {
  useSeoGscHealth,
  useSeoGscReconcile,
  useSeoGscAutoFix,
  useSeoInspectUrl,
  useSeoSubmitForIndexing,
  seoGSCKeys,
} from '@/hooks/seo/useSeoGSC'
import GscConnectModal from './GscConnectModal'
import SignalUpgradeCard from './signal/SignalUpgradeCard'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface SEOSearchConsoleProps {
  projectId: string
}

interface GSCIssue {
  id?: string | number
  url: string
  path?: string
  issueType?: string
  details?: string
  lastInspected?: string
  fixStatus?: 'submitted' | 'applied' | 'failed' | null
  autoFixable?: boolean
}

interface GSCCoverage {
  coverageRate: number
  totalCanonical: number
  indexed: number
  notIndexed: number
  pending: number
  errors: number
}

interface GSCQuota {
  inspectionsUsed: number
  submissionsUsed: number
}

interface GSCHealthData {
  gscConnected: boolean
  gscPropertyUrl?: string
  lastSyncedAt?: string
  coverage?: GSCCoverage
  quota?: GSCQuota
  issues?: GSCIssue[]
}

interface AutoFixAction {
  status: 'success' | 'error' | 'flagged'
  description: string
}

interface AutoFixResults {
  summary?: {
    actionsExecuted: number
    actionsFlagged: number
    actionsFailed: number
  }
  actions?: AutoFixAction[]
}

interface IssueCategoryProps {
  type: keyof typeof ISSUE_TYPES
  issues: GSCIssue[]
  projectId: string
  hasSignal: boolean
}

interface CoverageRingProps {
  rate: number
  size?: number
}

interface QuotaBadgeProps {
  used: number
  limit: number
  label: string
}

interface FixStatusProps {
  status?: 'submitted' | 'applied' | 'failed' | null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ISSUE TYPE CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ISSUE_TYPES = {
  not_indexed: {
    label: 'Not Indexed',
    icon: Eye,
    description: 'Pages not yet in Google\'s index',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-l-amber-500',
  },
  crawl_error: {
    label: 'Crawl Errors',
    icon: XCircle,
    description: 'Googlebot can\'t fetch these pages',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-l-red-500',
  },
  not_found: {
    label: 'Not Found (404)',
    icon: FileX,
    description: 'Pages returning 404 errors',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-l-red-500',
  },
  blocked: {
    label: 'Robots Blocked',
    icon: Shield,
    description: 'Blocked by robots.txt or meta robots',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-l-orange-500',
  },
  redirect: {
    label: 'Redirect Issues',
    icon: ArrowRight,
    description: 'Pages redirecting to other URLs',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-l-blue-500',
  },
  canonical_mismatch: {
    label: 'Canonical Mismatch',
    icon: Link2,
    description: 'Google selected a different canonical URL',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-l-purple-500',
  },
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COVERAGE RING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CoverageRing({ rate, size = 120 }: CoverageRingProps) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (rate / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--brand-primary)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color: 'var(--brand-primary)' }}>
          {rate}%
        </span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Indexed
        </span>
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// QUOTA BADGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function QuotaBadge({ used, limit, label }: QuotaBadgeProps) {
  const remaining = limit - used
  const pct = (used / limit) * 100
  const isWarning = pct > 80
  const isExhausted = remaining <= 0

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
          isExhausted ? 'bg-red-500/10 text-red-500' :
          isWarning ? 'bg-amber-500/10 text-amber-500' :
          'bg-muted text-muted-foreground'
        )}>
          <span>{label}</span>
          <span className="font-mono">{remaining}/{limit}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{remaining} {label.toLowerCase()} remaining today (resets at midnight UTC)</p>
      </TooltipContent>
    </Tooltip>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FIX STATUS INDICATOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function FixStatus({ status }: FixStatusProps) {
  switch (status) {
    case 'submitted':
      return (
        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded" style={{
          color: 'var(--brand-primary)',
          backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)',
        }}>
          <Loader2 className="h-3 w-3 animate-spin" />
          Submitted
        </span>
      )
    case 'applied':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
          <CheckCircle2 className="h-3 w-3" />
          Fixed
        </span>
      )
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
          <XCircle className="h-3 w-3" />
          Failed
        </span>
      )
    default:
      return (
        <span className="text-xs text-muted-foreground">
          Not fixed
        </span>
      )
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ISSUE CATEGORY SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function IssueCategory({ type, issues, projectId, hasSignal }: IssueCategoryProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const config = ISSUE_TYPES[type] || ISSUE_TYPES.not_indexed
  const Icon = config.icon
  const inspectUrl = useSeoInspectUrl()
  const submitForIndexing = useSeoSubmitForIndexing()

  if (issues.length === 0) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className={cn(
          'w-full flex items-center gap-3 p-3 rounded-lg transition-colors',
          'hover:bg-muted/50 text-left border-l-2',
          config.borderColor,
        )}>
          <div className={cn('p-1.5 rounded', config.bgColor)}>
            <Icon className={cn('h-4 w-4', config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{config.label}</span>
              <Badge variant="secondary" className="text-xs h-5">
                {issues.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
          </div>
          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground text-xs">
                <th className="text-left p-2 pl-3 font-medium">URL</th>
                <th className="text-left p-2 font-medium hidden md:table-cell">Details</th>
                <th className="text-left p-2 font-medium hidden lg:table-cell">Last Inspected</th>
                <th className="text-left p-2 font-medium">Status</th>
                <th className="text-right p-2 pr-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {issues.slice(0, 20).map((issue, idx) => (
                <tr key={issue.id || idx} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="p-2 pl-3 max-w-[200px]">
                    <span className="text-xs font-mono truncate block" title={issue.url}>
                      {issue.path || issue.url}
                    </span>
                  </td>
                  <td className="p-2 text-xs text-muted-foreground hidden md:table-cell max-w-[250px]">
                    <span className="line-clamp-2">{issue.details}</span>
                  </td>
                  <td className="p-2 text-xs text-muted-foreground hidden lg:table-cell">
                    {issue.lastInspected
                      ? new Date(issue.lastInspected).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="p-2">
                    <FixStatus status={issue.fixStatus} />
                  </td>
                  <td className="p-2 pr-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => inspectUrl.mutate({ projectId, url: issue.url })}
                            disabled={inspectUrl.isPending}
                          >
                            <Search className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Inspect URL</TooltipContent>
                      </Tooltip>
                      {issue.autoFixable && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={!hasSignal || submitForIndexing.isPending || issue.fixStatus === 'submitted'}
                              onClick={() => submitForIndexing.mutate({ projectId, url: issue.url })}
                            >
                              {hasSignal ? (
                                <Send className="h-3.5 w-3.5" />
                              ) : (
                                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {hasSignal ? 'Submit for indexing' : 'Requires Signal'}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {issues.length > 20 && (
            <div className="p-2 text-center text-xs text-muted-foreground border-t">
              Showing 20 of {issues.length} issues
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function SEOSearchConsole({ projectId }: SEOSearchConsoleProps) {
  const queryClient = useQueryClient()
  const { hasAccess: hasSignalAccess } = useSignalAccess()
  const { data: health, isLoading, error, refetch } = useSeoGscHealth(projectId)
  const reconcile = useSeoGscReconcile()
  const autoFix = useSeoGscAutoFix()
  const [showConnect, setShowConnect] = useState<boolean>(false)
  const [autoFixResults, setAutoFixResults] = useState<AutoFixResults | null>(null)

  const handleGscConnectSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: seoGSCKeys.health(projectId) })
    queryClient.invalidateQueries({ queryKey: seoGSCKeys.all })
    setShowConnect(false)
  }, [projectId, queryClient])

  // Group issues by type
  const issuesByType = useMemo<Record<string, GSCIssue[]>>(() => {
    if (!health?.issues) return {}
    const grouped: Record<string, GSCIssue[]> = {}
    for (const issue of health.issues) {
      const type = issue.issueType || 'not_indexed'
      if (!grouped[type]) grouped[type] = []
      grouped[type].push(issue)
    }
    return grouped
  }, [health?.issues])

  const isReconciling = reconcile.isPending || autoFix.isPending

  const handleAutoFix = async (): Promise<void> => {
    try {
      const result = await autoFix.mutateAsync(projectId)
      setAutoFixResults(result as AutoFixResults)
    } catch (err) {
      console.error('Auto-fix failed:', err)
    }
  }

  const handleReconcile = async (): Promise<void> => {
    try {
      await reconcile.mutateAsync(projectId)
    } catch (err) {
      console.error('Reconcile failed:', err)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="border-red-500/20">
        <CardContent className="py-8 text-center">
          <XCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Failed to load GSC health data</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Not connected state
  if (health && !health.gscConnected) {
    return (
      <>
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full" style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 15%, transparent), color-mix(in srgb, var(--brand-primary) 15%, transparent))'
            }}>
              <Globe className="h-8 w-8" style={{ color: 'var(--brand-primary)' }} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Connect Google Search Console</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Connect your Google Search Console account to see indexing coverage, identify issues,
              and {hasSignalAccess ? 'let Signal auto-fix them' : 'get recommendations'}.
            </p>
            <Button
              onClick={() => setShowConnect(true)}
              style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
            >
              <Globe className="h-4 w-4 mr-2" />
              Connect GSC
            </Button>
          </CardContent>
        </Card>
        <GscConnectModal
          open={showConnect}
          onOpenChange={setShowConnect}
          projectId={projectId}
          onSuccess={handleGscConnectSuccess}
        />
      </>
    )
  }

  const { coverage, quota, issues } = health || {}

  return (
    <TooltipProvider>
      <div className="space-y-6" data-sonor-help="seo/rankings">
        {/* ── HEADER ROW ─────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
              Search Console
            </h2>
            {health?.gscPropertyUrl && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {health.gscPropertyUrl}
                {health.lastSyncedAt && (
                  <> &middot; Last synced {new Date(health.lastSyncedAt).toLocaleDateString()}</>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Quota badges */}
            {quota && (
              <>
                <QuotaBadge used={quota.inspectionsUsed} limit={2000} label="Inspections" />
                <QuotaBadge used={quota.submissionsUsed} limit={200} label="Submissions" />
              </>
            )}
            {/* Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleReconcile}
              disabled={isReconciling}
              className="gap-1.5"
            >
              {reconcile.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Inspect All
            </Button>
            {hasSignalAccess ? (
              <Button
                size="sm"
                onClick={handleAutoFix}
                disabled={isReconciling || !issues?.length}
                className="gap-1.5 text-white"
                style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary))' }}
              >
                {autoFix.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                Auto-Fix All
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" disabled className="gap-1.5 opacity-60">
                    <Lock className="h-3.5 w-3.5" />
                    Auto-Fix All
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Upgrade to Signal to auto-fix indexing issues</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* ── COVERAGE SUMMARY ────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Coverage ring */}
          <Card className="md:col-span-1 flex items-center justify-center py-4">
            <CoverageRing rate={coverage?.coverageRate || 0} />
          </Card>

          {/* Metric cards */}
          <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Pages</p>
                <p className="text-2xl font-bold">{coverage?.totalCanonical || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Canonical sitemap pages</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Indexed</p>
                <p className="text-2xl font-bold text-emerald-500">{coverage?.indexed || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">In Google's index</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Not Indexed</p>
                <p className="text-2xl font-bold text-amber-500">{coverage?.notIndexed || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {coverage?.pending > 0 ? `${coverage.pending} pending` : 'Needs attention'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Errors</p>
                <p className="text-2xl font-bold text-red-500">{coverage?.errors || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Crawl & server errors</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── PROGRESS BAR (during reconciliation) ─────────── */}
        {isReconciling && (
          <Card className="border" style={{ borderColor: 'color-mix(in srgb, var(--brand-primary) 30%, transparent)' }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--brand-primary)' }} />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {autoFix.isPending ? 'Signal is analyzing and fixing issues...' : 'Inspecting pages...'}
                  </p>
                  <p className="text-xs text-muted-foreground">This may take a minute depending on the number of pages</p>
                </div>
              </div>
              <Progress className="mt-3 h-1.5" value={undefined} />
            </CardContent>
          </Card>
        )}

        {/* ── AUTO-FIX RESULTS ─────────────────────────────── */}
        {autoFixResults && (
          <Card className="border-emerald-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                Signal Auto-Fix Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center p-2 rounded bg-emerald-500/10">
                  <p className="text-lg font-bold text-emerald-500">{autoFixResults.summary?.actionsExecuted || 0}</p>
                  <p className="text-xs text-muted-foreground">Fixed</p>
                </div>
                <div className="text-center p-2 rounded bg-amber-500/10">
                  <p className="text-lg font-bold text-amber-500">{autoFixResults.summary?.actionsFlagged || 0}</p>
                  <p className="text-xs text-muted-foreground">Flagged</p>
                </div>
                <div className="text-center p-2 rounded bg-red-500/10">
                  <p className="text-lg font-bold text-red-500">{autoFixResults.summary?.actionsFailed || 0}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
              {autoFixResults.actions?.length > 0 && (
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {autoFixResults.actions.map((action, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs p-1.5 rounded hover:bg-muted/30">
                      {action.status === 'success' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      ) : action.status === 'error' ? (
                        <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      )}
                      <span className="text-muted-foreground">{action.description}</span>
                    </div>
                  ))}
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => setAutoFixResults(null)}
              >
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── ISSUE CATEGORIES ────────────────────────────────── */}
        {issues?.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Issues ({issues.length})
            </h3>
            {Object.keys(ISSUE_TYPES).map(type => (
              <IssueCategory
                key={type}
                type={type as keyof typeof ISSUE_TYPES}
                issues={issuesByType[type] || []}
                projectId={projectId}
                hasSignal={hasSignalAccess}
              />
            ))}
          </div>
        ) : (
          !isLoading && coverage?.totalCanonical > 0 && (
            <Card className="border-emerald-500/20">
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">All Pages Indexed</h3>
                <p className="text-sm text-muted-foreground">
                  All {coverage.totalCanonical} canonical pages are indexed in Google Search Console.
                </p>
              </CardContent>
            </Card>
          )
        )}

        {/* ── SIGNAL UPGRADE (if no Signal) ───────────────────── */}
        {!hasSignalAccess && issues?.length > 0 && (
          <SignalUpgradeCard
            feature="autofix"
            variant="inline"
          />
        )}
      </div>
    </TooltipProvider>
  )
}
