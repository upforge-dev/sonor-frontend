/**
 * TargetCompanyModal - Full-featured modal for target company details
 * World-class UI displaying all scraped data: AI analysis, pitch angles,
 * call prep, tech stack, scoring breakdown, and more
 */
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { 
  X,
  Globe,
  Phone, 
  Mail,
  User,
  Clock,
  Sparkles,
  Target,
  Zap,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  MapPin,
  Users,
  DollarSign,
  Calendar,
  Lightbulb,
  MessageSquare,
  Shield,
  Gauge,
  BarChart3,
  Code2,
  Smartphone,
  Monitor,
  Layers,
  CheckCircle2,
  XCircle,
  Star,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { 
  useClaimTargetCompany, 
  useUnclaimTargetCompany 
} from '@/lib/hooks'
import { toast } from 'sonner'

// Score configuration
const getScoreConfig = (score) => {
  if (score >= 80) return { 
    label: 'Hot Lead', 
    color: 'bg-red-500/20 text-red-400 border-red-500/30', 
    barColor: 'bg-gradient-to-r from-red-500 to-orange-500',
    glowColor: 'shadow-red-500/20',
    icon: '🔥'
  }
  if (score >= 60) return { 
    label: 'Warm', 
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', 
    barColor: 'bg-gradient-to-r from-orange-500 to-yellow-500',
    glowColor: 'shadow-orange-500/20',
    icon: '☀️'
  }
  if (score >= 40) return { 
    label: 'Potential', 
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', 
    barColor: 'bg-gradient-to-r from-yellow-500 to-green-500',
    glowColor: 'shadow-yellow-500/20',
    icon: '💡'
  }
  if (score >= 20) return { 
    label: 'Cool', 
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', 
    barColor: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    glowColor: 'shadow-blue-500/20',
    icon: '❄️'
  }
  return { 
    label: 'Low Priority', 
    color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', 
    barColor: 'bg-zinc-500',
    glowColor: 'shadow-zinc-500/20',
    icon: '⚪'
  }
}

// Format relative time
function formatRelativeTime(date) {
  if (!date) return 'N/A'
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Score breakdown component
function ScoreBreakdown({ signals }) {
  if (!signals) return null
  
  const categories = [
    { key: 'performance', label: 'Performance', icon: Gauge, color: 'text-blue-400' },
    { key: 'seo', label: 'SEO Issues', icon: BarChart3, color: 'text-green-400' },
    { key: 'mobile', label: 'Mobile', icon: Smartphone, color: 'text-purple-400' },
    { key: 'technology', label: 'Tech Stack', icon: Code2, color: 'text-orange-400' },
    { key: 'business', label: 'Business Signals', icon: Building2, color: 'text-cyan-400' },
  ]
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {categories.map(cat => {
        const value = signals[cat.key]?.score ?? signals[cat.key] ?? null
        if (value === null) return null
        const Icon = cat.icon
        return (
          <div 
            key={cat.key}
            className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--glass-border)]"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={cn('w-4 h-4', cat.color)} />
              <span className="text-xs text-[var(--text-muted)]">{cat.label}</span>
            </div>
            <div className="text-xl font-bold text-[var(--text-primary)]">
              {typeof value === 'number' ? `${value}%` : value}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Metric card component
function MetricCard({ icon: Icon, label, value, subtext, color = 'text-[var(--accent-primary)]' }) {
  return (
    <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', color.replace('text-', 'bg-').replace(/400|500/, '500/20'))}>
          <Icon className={cn('w-4 h-4', color)} />
        </div>
        <span className="text-sm text-[var(--text-muted)]">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[var(--text-primary)]">{value}</div>
      {subtext && <p className="text-xs text-[var(--text-muted)] mt-1">{subtext}</p>}
    </div>
  )
}

// Pitch angle card
function PitchAngleCard({ angle, index }) {
  const isString = typeof angle === 'string'
  const title = isString ? `Pitch Angle ${index + 1}` : (angle.title || `Pitch Angle ${index + 1}`)
  const hook = isString ? angle : (angle.hook || angle.description || '')
  const proofPoints = !isString && Array.isArray(angle.proofPoints) ? angle.proofPoints : []
  const confidence = !isString ? (angle.confidence || 'medium') : 'medium'
  
  const confidenceColors = {
    high: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-red-500/20 text-red-400 border-red-500/30',
  }
  
  return (
    <div className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--glass-border)] hover:border-[var(--accent-primary)]/30 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/20 flex items-center justify-center text-sm font-bold text-[var(--accent-primary)]">
            {index + 1}
          </div>
          <h4 className="font-medium text-[var(--text-primary)]">{title}</h4>
        </div>
        <Badge variant="outline" className={cn('text-xs', confidenceColors[confidence] || confidenceColors.medium)}>
          {confidence}
        </Badge>
      </div>
      
      {hook && (
        <p className="text-sm text-[var(--text-secondary)] mb-3 leading-relaxed">
          "{hook}"
        </p>
      )}
      
      {proofPoints.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-[var(--glass-border)]">
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Proof Points</span>
          <ul className="space-y-1.5">
            {proofPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// Call prep section
function CallPrepSection({ callPrep, onRegenerate, isLoading }) {
  if (!callPrep) {
    return (
      <div className="text-center py-12">
        <Phone className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
          No Call Prep Generated
        </h3>
        <p className="text-sm text-[var(--text-muted)] mb-4 max-w-md mx-auto">
          Generate AI-powered call preparation to help you nail your first call with this prospect.
        </p>
        <Button onClick={onRegenerate} disabled={isLoading}>
          <Sparkles className={cn('w-4 h-4 mr-2', isLoading && 'animate-pulse')} />
          Generate Call Prep
        </Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Opening Line - Featured */}
      {callPrep.opening_line && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)]/10 to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/20">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-5 h-5 text-[var(--accent-primary)]" />
            <span className="text-sm font-medium text-[var(--accent-primary)]">Opening Line</span>
          </div>
          <p className="text-lg text-[var(--text-primary)] italic leading-relaxed">
            "{callPrep.opening_line}"
          </p>
        </div>
      )}
      
      {/* Key Points */}
      {callPrep.key_points?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Key Talking Points
          </h4>
          <div className="grid gap-3">
            {callPrep.key_points.map((point, idx) => (
              <div 
                key={idx}
                className="flex items-start gap-3 p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--glass-border)]"
              >
                <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-[var(--accent-primary)]">{idx + 1}</span>
                </div>
                <p className="text-sm text-[var(--text-primary)]">{point}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Objection Handlers */}
      {callPrep.objection_handlers?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Handle Objections
          </h4>
          <div className="space-y-3">
            {callPrep.objection_handlers.map((handler, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--glass-border)]"
              >
                <div className="flex items-start gap-3 mb-3">
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[var(--text-muted)] italic">"{handler.objection}"</p>
                </div>
                <div className="flex items-start gap-3 pl-7">
                  <ArrowRight className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[var(--text-primary)]">{handler.response}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Regenerate Button */}
      <div className="flex justify-center pt-4">
        <Button variant="outline" onClick={onRegenerate} disabled={isLoading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
          Regenerate Call Prep
        </Button>
      </div>
    </div>
  )
}

// Scoring factor component
function ScoringFactor({ factor, index }) {
  const isPositive = factor.impact === 'positive'
  
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--glass-border)]">
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
        isPositive ? 'bg-green-500/20' : 'bg-amber-500/20'
      )}>
        {isPositive ? (
          <TrendingUp className="w-4 h-4 text-green-400" />
        ) : (
          <TrendingDown className="w-4 h-4 text-amber-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text-primary)]">{factor.reason}</p>
        {factor.weight && (
          <span className="text-xs text-[var(--text-muted)]">Weight: {factor.weight}</span>
        )}
      </div>
      {factor.score && (
        <Badge variant="outline" className={cn(
          'flex-shrink-0',
          isPositive ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
        )}>
          {isPositive ? '+' : ''}{factor.score}
        </Badge>
      )}
    </div>
  )
}

export default function TargetCompanyModal({ company, open, onClose }) {
  const [copiedField, setCopiedField] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Mutations
  const claimMutation = useClaimTargetCompany()
  const unclaimMutation = useUnclaimTargetCompany()
  const callPrepLoading = false // TODO: Add when getCallPrep hook is ready

  const scoreConfig = useMemo(() => getScoreConfig(company?.score || 0), [company?.score])
  
  if (!company) return null

  const hasCallPrep = !!company.call_prep
  const isClaimed = !!company.claimed_by

  const handleCopy = async (text, field) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleClaim = async () => {
    try {
      await claimMutation.mutateAsync({ id: company.id })
      toast.success('Company claimed!')
    } catch (err) {
      toast.error('Failed to claim company')
    }
  }

  const handleUnclaim = async () => {
    try {
      await unclaimMutation.mutateAsync({ id: company.id })
      toast.success('Company unclaimed')
    } catch (err) {
      toast.error('Failed to unclaim company')
    }
  }

  const handleGenerateCallPrep = async () => {
    try {
      // TODO: Add getCallPrep hook when CRM is fully migrated
      toast.info('Call prep generation coming soon')
    } catch (err) {
      toast.error('Failed to generate call prep')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 bg-[var(--surface-primary)] border-[var(--glass-border)] overflow-hidden">
        <DialogTitle className="sr-only">{company.domain} - Company Details</DialogTitle>
        
        {/* Hero Header */}
        <div className="relative flex-shrink-0 p-6 pb-4 bg-gradient-to-br from-[var(--surface-secondary)] via-[var(--surface-primary)] to-[var(--surface-secondary)] border-b border-[var(--glass-border)]">
          {/* Background Score Glow */}
          <div 
            className={cn(
              'absolute inset-0 opacity-20 blur-3xl',
              scoreConfig.barColor
            )}
          />
          
          <div className="relative flex items-start justify-between gap-6">
            {/* Company Info */}
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <div className="w-16 h-16 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center flex-shrink-0">
                <Globe className="w-8 h-8 text-[var(--accent-primary)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                    {company.domain}
                  </h1>
                  {isClaimed && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <User className="w-3 h-3 mr-1" />
                      Claimed
                    </Badge>
                  )}
                  {company.status && company.status !== 'new' && (
                    <Badge variant="outline">{company.status}</Badge>
                  )}
                </div>
                {company.company_name && company.company_name !== company.domain && (
                  <p className="text-lg text-[var(--text-secondary)] mt-1">
                    {company.company_name}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm text-[var(--text-muted)]">
                  {company.industry && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" />
                      {company.industry}
                    </span>
                  )}
                  {company.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {company.location}
                    </span>
                  )}
                  {company.employee_count && (
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {company.employee_count} employees
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Analyzed {formatRelativeTime(company.analyzed_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Score Display */}
            <div className="flex-shrink-0 text-right">
              <div className={cn(
                'inline-flex items-center gap-3 px-6 py-4 rounded-2xl border',
                scoreConfig.color,
                'shadow-lg',
                scoreConfig.glowColor
              )}>
                <span className="text-3xl">{scoreConfig.icon}</span>
                <div>
                  <div className="text-4xl font-bold">{company.score || 0}</div>
                  <div className="text-sm opacity-80">{scoreConfig.label}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="relative flex items-center gap-3 mt-6">
            <a 
              href={`https://${company.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] rounded-lg border border-[var(--glass-border)] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Visit Website
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(company.domain, 'domain')}
            >
              {copiedField === 'domain' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span className="ml-2">Copy Domain</span>
            </Button>
            {company.email && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(company.email, 'email')}
              >
                <Mail className="w-4 h-4" />
                <span className="ml-2">{company.email}</span>
              </Button>
            )}
            {company.phone && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(company.phone, 'phone')}
              >
                <Phone className="w-4 h-4" />
                <span className="ml-2">{company.phone}</span>
              </Button>
            )}
            
            <div className="flex-1" />
            
            {isClaimed ? (
              <Button variant="outline" onClick={handleUnclaim}>
                Unclaim
              </Button>
            ) : (
              <Button onClick={handleClaim} className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white">
                <Zap className="w-4 h-4 mr-2" />
                Claim Prospect
              </Button>
            )}
          </div>
        </div>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="flex-shrink-0 mx-6 mt-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] p-1">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="pitch" className="gap-2">
              <Target className="w-4 h-4" />
              Pitch Angles
              {company.pitch_angles?.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{company.pitch_angles.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="callprep" className="gap-2">
              <Phone className="w-4 h-4" />
              Call Prep
              {hasCallPrep && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
            </TabsTrigger>
            <TabsTrigger value="tech" className="gap-2">
              <Code2 className="w-4 h-4" />
              Tech Stack
            </TabsTrigger>
            <TabsTrigger value="signals" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Raw Data
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6">
              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-0 space-y-6">
                {/* AI Summary - Featured */}
                {company.ai_summary && (
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 via-[var(--surface-secondary)] to-blue-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      <span className="font-medium text-purple-400">AI Analysis</span>
                    </div>
                    <p className="text-[var(--text-primary)] leading-relaxed">
                      {company.ai_summary}
                    </p>
                  </div>
                )}

                {/* Score Breakdown */}
                {company.signals && (
                  <div>
                    <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                      <Gauge className="w-4 h-4" />
                      Score Breakdown
                    </h3>
                    <ScoreBreakdown signals={company.signals} />
                  </div>
                )}

                {/* Top Scoring Factors */}
                {company.top_factors?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Key Scoring Factors
                    </h3>
                    <div className="grid gap-3">
                      {company.top_factors.map((factor, idx) => (
                        <ScoringFactor key={idx} factor={factor} index={idx} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {company.page_speed && (
                    <MetricCard 
                      icon={Gauge} 
                      label="Page Speed" 
                      value={company.page_speed} 
                      color="text-blue-400"
                    />
                  )}
                  {company.mobile_score && (
                    <MetricCard 
                      icon={Smartphone} 
                      label="Mobile Score" 
                      value={`${company.mobile_score}%`} 
                      color="text-purple-400"
                    />
                  )}
                  {company.seo_score && (
                    <MetricCard 
                      icon={BarChart3} 
                      label="SEO Score" 
                      value={`${company.seo_score}%`} 
                      color="text-green-400"
                    />
                  )}
                  {company.estimated_revenue && (
                    <MetricCard 
                      icon={DollarSign} 
                      label="Est. Revenue" 
                      value={company.estimated_revenue} 
                      color="text-yellow-400"
                    />
                  )}
                </div>

                {/* Linked Contacts */}
                <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Linked Contacts
                    </h3>
                    <Button variant="ghost" size="sm">
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add Contact
                    </Button>
                  </div>
                  {company.prospects?.length > 0 ? (
                    <div className="grid gap-2">
                      {company.prospects.map((prospect) => (
                        <div 
                          key={prospect.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--glass-bg-hover)] transition-colors cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center">
                            <span className="text-sm font-medium text-[var(--accent-primary)]">
                              {prospect.name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[var(--text-primary)] truncate">
                              {prospect.name || 'Unknown'}
                            </p>
                            <p className="text-sm text-[var(--text-muted)] truncate">
                              {prospect.email || prospect.phone || 'No contact info'}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)] text-center py-4">
                      No contacts linked yet
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* Pitch Angles Tab */}
              <TabsContent value="pitch" className="mt-0">
                {company.pitch_angles?.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {company.pitch_angles.map((angle, idx) => (
                      <PitchAngleCard key={idx} angle={angle} index={idx} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Target className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                      No Pitch Angles Generated
                    </h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      Pitch angles will be generated during analysis.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Call Prep Tab */}
              <TabsContent value="callprep" className="mt-0">
                <CallPrepSection 
                  callPrep={company.call_prep} 
                  onRegenerate={handleGenerateCallPrep}
                  isLoading={callPrepLoading}
                />
              </TabsContent>

              {/* Tech Stack Tab */}
              <TabsContent value="tech" className="mt-0">
                {company.tech_stack?.length > 0 ? (
                  <div>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {company.tech_stack.map((tech) => (
                        <Badge 
                          key={tech} 
                          variant="secondary" 
                          className="px-3 py-1.5 text-sm bg-[var(--surface-secondary)]"
                        >
                          <Code2 className="w-3.5 h-3.5 mr-1.5 opacity-60" />
                          {tech}
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Tech Insights */}
                    <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                      <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
                        Technology Insights
                      </h4>
                      <p className="text-sm text-[var(--text-muted)]">
                        This company uses {company.tech_stack.length} detected technologies. 
                        {company.tech_stack.some(t => t.toLowerCase().includes('wix') || t.toLowerCase().includes('squarespace') || t.toLowerCase().includes('wordpress')) && (
                          ' They appear to be using a website builder platform, which could indicate opportunities for a custom solution.'
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Code2 className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                      No Tech Stack Detected
                    </h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      Technology detection runs during website analysis.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Raw Signals Tab */}
              <TabsContent value="signals" className="mt-0">
                {company.signals && Object.keys(company.signals).length > 0 ? (
                  <div className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--glass-border)]">
                    <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Raw Signal Data
                    </h4>
                    <pre className="text-xs text-[var(--text-muted)] overflow-auto max-h-[500px] p-4 rounded-lg bg-[var(--surface-primary)]">
                      {JSON.stringify(company.signals, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                      No Raw Signal Data
                    </h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      Signal data is collected during website analysis.
                    </p>
                  </div>
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
