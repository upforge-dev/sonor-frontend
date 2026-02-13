// src/components/seo/local/LocalSeoEntityHealth.jsx
// Entity Health Score - GBP optimization and local signals
import { useState } from 'react'
import { useEntityHealth, useRefreshEntityHealth } from '@/lib/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  RefreshCw, 
  Building2,
  Star,
  Camera,
  FileText,
  MapPin,
  Phone,
  Globe,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronRight,
  ExternalLink
} from 'lucide-react'

// Score signal configurations
const SCORE_SIGNALS = [
  { key: 'gbp_completeness', label: 'GBP Completeness', icon: Building2, description: 'Profile completeness (photos, hours, description, etc.)' },
  { key: 'primary_category_score', label: 'Primary Category', icon: Building2, description: 'Is the primary category optimal for your business?' },
  { key: 'secondary_categories_score', label: 'Secondary Categories', icon: Building2, description: 'Relevant secondary categories added' },
  { key: 'nap_consistency_score', label: 'NAP Consistency', icon: FileText, description: 'Name, Address, Phone consistency across citations' },
  { key: 'review_velocity_score', label: 'Review Velocity', icon: MessageSquare, description: 'New reviews per month vs competitors' },
  { key: 'review_sentiment_score', label: 'Review Sentiment', icon: Star, description: 'Average sentiment and rating of reviews' },
  { key: 'photo_freshness_score', label: 'Photo Freshness', icon: Camera, description: 'Recency of photo uploads' },
  { key: 'post_frequency_score', label: 'GBP Posts', icon: FileText, description: 'Frequency of Google Business posts' },
  { key: 'service_area_score', label: 'Service Area', icon: MapPin, description: 'Service area clarity and coverage' }
]

// Get score color
const getScoreColor = (score) => {
  if (score >= 80) return 'var(--brand-primary)'
  if (score >= 60) return 'var(--accent-orange)'
  return 'var(--accent-red)'
}

const getScoreBg = (score) => {
  if (score >= 80) return 'bg-[var(--brand-primary)]/10'
  if (score >= 60) return 'bg-[var(--accent-orange)]/10'
  return 'bg-[var(--accent-red)]/10'
}

const getTrendIcon = (current, previous) => {
  if (!previous) return null
  if (current > previous) return <TrendingUp className="h-4 w-4 text-[var(--brand-primary)]" />
  if (current < previous) return <TrendingDown className="h-4 w-4 text-[var(--accent-red)]" />
  return <Minus className="h-4 w-4 text-[var(--text-tertiary)]" />
}

export default function LocalSeoEntityHealth({ projectId }) {
  const [expandedSignal, setExpandedSignal] = useState(null)

  // React Query hooks
  const { 
    data: entityScore,
    isLoading: entityScoreLoading
  } = useEntityHealth(projectId)
  
  const refreshMutation = useRefreshEntityHealth()
  const isLoading = refreshMutation.isPending

  const handleRefresh = async () => {
    try {
      await refreshMutation.mutateAsync({ projectId })
    } catch (error) {
      console.error('Failed to refresh entity score:', error)
    }
  }

  // Group issues by severity
  const issues = entityScore?.issues || []
  const criticalIssues = issues.filter(i => i.severity === 'critical')
  const warningIssues = issues.filter(i => i.severity === 'warning')
  const infoIssues = issues.filter(i => i.severity === 'info')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Entity Health Score</h2>
          <p className="text-[var(--text-secondary)]">
            Track your Google Business Profile and local SEO signals
          </p>
        </div>
        <Button 
          onClick={handleRefresh}
          disabled={isLoading || entityScoreLoading}
          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Run Analysis
        </Button>
      </div>

      {entityScore ? (
        <>
          {/* Main Score Card */}
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="py-8">
              <div className="flex items-center gap-12">
                {/* Score Circle */}
                <div className="relative">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="var(--glass-border)"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke={getScoreColor(entityScore.total_score)}
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(entityScore.total_score / 100) * 440} 440`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <span 
                        className="text-4xl font-bold"
                        style={{ color: getScoreColor(entityScore.total_score) }}
                      >
                        {entityScore.total_score}
                      </span>
                      <span className="text-lg text-[var(--text-secondary)] block">/100</span>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                      {entityScore.total_score >= 80 ? 'Excellent' :
                       entityScore.total_score >= 60 ? 'Good' :
                       entityScore.total_score >= 40 ? 'Needs Improvement' : 'Critical'}
                    </h3>
                    {entityScore.previous_score && (
                      <div className="flex items-center gap-1">
                        {getTrendIcon(entityScore.total_score, entityScore.previous_score)}
                        <span className="text-sm text-[var(--text-secondary)]">
                          {entityScore.total_score - entityScore.previous_score > 0 ? '+' : ''}
                          {entityScore.total_score - entityScore.previous_score} pts
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-[var(--text-secondary)] mb-4">
                    {entityScore.total_score >= 80 
                      ? 'Your local SEO signals are strong. Keep up the great work!' 
                      : entityScore.total_score >= 60
                      ? 'Good foundation, but there are optimization opportunities.'
                      : 'Significant improvements needed to compete in local search.'
                    }
                  </p>

                  {/* Issue Summary */}
                  <div className="flex items-center gap-4">
                    {criticalIssues.length > 0 && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        {criticalIssues.length} Critical
                      </Badge>
                    )}
                    {warningIssues.length > 0 && (
                      <Badge variant="warning" className="flex items-center gap-1 bg-[var(--accent-orange)] text-white">
                        <AlertTriangle className="h-3 w-3" />
                        {warningIssues.length} Warnings
                      </Badge>
                    )}
                    {criticalIssues.length === 0 && warningIssues.length === 0 && (
                      <Badge className="flex items-center gap-1 bg-[var(--brand-primary)]">
                        <CheckCircle className="h-3 w-3" />
                        No Issues
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Last Checked */}
                <div className="text-right">
                  <p className="text-sm text-[var(--text-secondary)]">Last analyzed</p>
                  <p className="text-[var(--text-primary)]">
                    {entityScore.checked_at 
                      ? new Date(entityScore.checked_at).toLocaleDateString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signal Scores Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SCORE_SIGNALS.map(signal => {
              const score = entityScore[signal.key]
              const Icon = signal.icon
              const isExpanded = expandedSignal === signal.key
              
              return (
                <Card 
                  key={signal.key}
                  className={`bg-[var(--glass-bg)] border-[var(--glass-border)] cursor-pointer transition-all hover:border-[var(--brand-primary)]`}
                  onClick={() => setExpandedSignal(isExpanded ? null : signal.key)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {signal.label}
                        </span>
                      </div>
                      <span 
                        className="text-lg font-bold"
                        style={{ color: score !== undefined ? getScoreColor(score) : 'var(--text-tertiary)' }}
                      >
                        {score !== undefined ? score : '-'}
                      </span>
                    </div>
                    
                    {score !== undefined && (
                      <Progress 
                        value={score} 
                        className="h-1.5"
                        style={{
                          '--progress-color': getScoreColor(score)
                        }}
                      />
                    )}

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
                        <p className="text-xs text-[var(--text-secondary)]">
                          {signal.description}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Issues List */}
          {issues.length > 0 && (
            <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
              <CardHeader>
                <CardTitle>Issues & Recommendations</CardTitle>
                <CardDescription>
                  Fix these issues to improve your entity health score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {issues.map((issue, i) => (
                    <div 
                      key={i}
                      className={`p-4 rounded-lg border ${
                        issue.severity === 'critical' 
                          ? 'bg-[var(--accent-red)]/5 border-[var(--accent-red)]/20' 
                          : issue.severity === 'warning'
                          ? 'bg-[var(--accent-orange)]/5 border-[var(--accent-orange)]/20'
                          : 'bg-[var(--glass-bg-inset)] border-[var(--glass-border)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {issue.severity === 'critical' ? (
                          <XCircle className="h-5 w-5 text-[var(--accent-red)] flex-shrink-0 mt-0.5" />
                        ) : issue.severity === 'warning' ? (
                          <AlertTriangle className="h-5 w-5 text-[var(--accent-orange)] flex-shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-[var(--text-tertiary)] flex-shrink-0 mt-0.5" />
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-[var(--text-primary)]">{issue.type}</p>
                            <Badge variant="outline" className="text-xs capitalize">
                              {issue.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-[var(--text-secondary)] mb-2">
                            {issue.description}
                          </p>
                          {issue.fix_suggestion && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-[var(--brand-primary)] font-medium">Fix:</span>
                              <span className="text-[var(--text-primary)]">{issue.fix_suggestion}</span>
                            </div>
                          )}
                        </div>
                        
                        <ChevronRight className="h-5 w-5 text-[var(--text-tertiary)]" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* GBP Quick Links */}
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Google Business Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="justify-start" asChild>
                  <a href="https://business.google.com" target="_blank" rel="noopener">
                    <Building2 className="h-4 w-4 mr-2" />
                    Edit Profile
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <a href="https://business.google.com/reviews" target="_blank" rel="noopener">
                    <Star className="h-4 w-4 mr-2" />
                    Manage Reviews
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <a href="https://business.google.com/photos" target="_blank" rel="noopener">
                    <Camera className="h-4 w-4 mr-2" />
                    Add Photos
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <a href="https://business.google.com/posts" target="_blank" rel="noopener">
                    <FileText className="h-4 w-4 mr-2" />
                    Create Post
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-[var(--text-tertiary)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              No Entity Health Data
            </h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Run an analysis to check your local SEO health signals
            </p>
            <Button 
              onClick={handleRefresh}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Run Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
