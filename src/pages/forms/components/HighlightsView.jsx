// src/pages/forms/components/HighlightsView.jsx
// Overview dashboard with key metrics, recent submissions, top forms, and Signal insights

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText,
  Inbox,
  TrendingUp,
  Star,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  MessageSquare,
  Sparkles,
  BarChart3,
} from 'lucide-react'
import SignalIcon from '@/components/ui/SignalIcon'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow, isValid } from 'date-fns'

// Quality tier badge config
const QUALITY_BADGE = {
  high: { label: 'High Intent', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  medium: { label: 'Medium', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  low: { label: 'Low', className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' },
  spam: { label: 'Spam', className: 'bg-red-500/10 text-red-600 dark:text-red-400' },
}

function StatCard({ title, value, description, icon: Icon, trend, trendLabel, isLoading }) {
  return (
    <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[var(--text-tertiary)]">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{value}</p>
            )}
            {description && (
              <p className="text-xs text-[var(--text-tertiary)] mt-1">{description}</p>
            )}
          </div>
          <div 
            className="p-2.5 rounded-xl"
            style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
          >
            <Icon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
          </div>
        </div>
        
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-3">
            {trend >= 0 ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
            )}
            <span className={cn(
              "text-xs font-medium",
              trend >= 0 ? "text-emerald-500" : "text-red-500"
            )}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
            {trendLabel && (
              <span className="text-xs text-[var(--text-tertiary)]">{trendLabel}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function HighlightsView({
  forms = [],
  submissions = [],
  stats,
  isLoading,
  hasSignal,
  onViewForm,
  onViewSubmission,
  onViewAllSubmissions,
}) {
  // Get recent submissions (last 10)
  const recentSubmissions = submissions.slice(0, 10)
  
  // Get top performing forms sorted by submission count (descending)
  const topForms = [...forms]
    .sort((a, b) => (b.submissionCount || b.submission_count || 0) - (a.submissionCount || a.submission_count || 0))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Forms"
          value={stats?.totalForms || 0}
          description={`${stats?.activeForms || 0} active`}
          icon={FileText}
          isLoading={isLoading}
        />
        <StatCard
          title="This Week"
          value={stats?.submissionsThisWeek || 0}
          description="submissions"
          icon={Inbox}
          trend={stats?.submissionsWeekOverWeekChange}
          trendLabel="vs last week"
          isLoading={isLoading}
        />
        <StatCard
          title="New Leads"
          value={stats?.newSubmissions || 0}
          description="awaiting review"
          icon={Users}
          isLoading={isLoading}
        />
        <StatCard
          title="High Intent"
          value={stats?.highIntentLeads || 0}
          description="quality leads"
          icon={Star}
          isLoading={isLoading}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Submissions */}
        <Card className="lg:col-span-2 bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-[var(--text-primary)]">
                  Recent Submissions
                </CardTitle>
                <CardDescription className="text-[var(--text-tertiary)]">
                  Latest form responses
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-[var(--text-secondary)]" onClick={onViewAllSubmissions}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-[var(--glass-bg-hover)]">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <Inbox className="h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-3" />
                <p className="text-[var(--text-secondary)]">No submissions yet</p>
                <p className="text-sm text-[var(--text-tertiary)]">Submissions will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentSubmissions.map((submission) => {
                  // Get name/email - check direct columns first, then fields object
                  const name = submission.name || 
                               submission.fields?.name || 
                               submission.fields?.full_name ||
                               submission.fields?.first_name ||
                               'Anonymous'
                  const email = submission.email || submission.fields?.email || ''
                  const qualityTier = submission.quality_tier || submission.qualityTier || 'medium'
                  const rawDate = submission.created_at || submission.createdAt
                  const createdAt = rawDate ? new Date(rawDate) : null
                  
                  return (
                    <button
                      key={submission.id}
                      onClick={() => onViewSubmission?.(submission.id)}
                      className="w-full flex items-center gap-4 p-3 rounded-lg bg-[var(--glass-bg-hover)] hover:bg-[var(--glass-border)] transition-colors text-left"
                    >
                      {/* Avatar */}
                      <div 
                        className="h-10 w-10 rounded-full flex items-center justify-center text-white font-medium"
                        style={{ backgroundColor: 'var(--brand-primary)' }}
                      >
                        {name.charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--text-primary)] truncate">
                            {name}
                          </span>
                          {qualityTier && QUALITY_BADGE[qualityTier] && (
                            <Badge className={cn("text-xs", QUALITY_BADGE[qualityTier].className)}>
                              {QUALITY_BADGE[qualityTier].label}
                            </Badge>
                          )}
                          {submission.status === 'new' && (
                            <span className="flex h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                          <span className="truncate">{email || 'No email'}</span>
                          <span>•</span>
                          <span className="text-xs">
                            {submission.form?.name || 'Unknown Form'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Time */}
                      <div className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">
                        {createdAt && isValid(createdAt) 
                          ? formatDistanceToNow(createdAt, { addSuffix: true })
                          : 'Unknown'
                        }
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Signal Insights */}
          {hasSignal && (
            <Card className="bg-gradient-to-br from-[var(--brand-primary)]/5 to-[var(--brand-primary)]/5 border-[var(--glass-border)]">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <SignalIcon className="h-5 w-5 text-[var(--brand-primary)]" />
                  <CardTitle className="text-base font-semibold text-[var(--text-primary)]">
                    Signal Insights
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="p-3 rounded-lg bg-[var(--glass-bg)]">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-[var(--brand-primary)]" />
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      Lead Quality Analysis
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {stats?.highIntentLeads > 0 
                      ? `${stats.highIntentLeads} high-intent leads detected this week. Consider prioritizing follow-up.`
                      : 'No high-intent leads this week. Consider reviewing form questions for better qualification.'
                    }
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-[var(--glass-bg)]">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      Spam Detection
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {stats?.spamCount > 0 
                      ? `${stats.spamCount} potential spam submissions filtered this week.`
                      : 'No spam detected this week.'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Forms */}
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[var(--text-primary)]">
                Top Forms
              </CardTitle>
              <CardDescription className="text-[var(--text-tertiary)]">
                By submission count
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : topForms.length === 0 ? (
                <div className="text-center py-4">
                  <FileText className="h-8 w-8 mx-auto text-[var(--text-tertiary)] mb-2" />
                  <p className="text-sm text-[var(--text-secondary)]">No forms yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {topForms.map((form, index) => (
                    <button
                      key={form.id}
                      onClick={() => onViewForm?.(form.id)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--glass-bg-hover)] transition-colors text-left"
                    >
                      <div 
                        className="h-8 w-8 rounded flex items-center justify-center text-sm font-bold"
                        style={{ 
                          backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
                          color: 'var(--brand-primary)'
                        }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {form.name}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {(form.isActive ?? form.is_active) ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                        <Inbox className="h-3.5 w-3.5" />
                        <span>{form.submissionCount || form.submission_count || 0}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[var(--text-primary)]">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <FileText className="h-4 w-4 mr-2" />
                Create New Form
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Embed Code
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
