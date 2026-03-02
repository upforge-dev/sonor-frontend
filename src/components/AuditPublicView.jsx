/**
 * AuditPublicView - Refactored
 * Full audit display for public magic link access
 * Uses extracted components from /audit/ folder following Liquid Glass design system
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  Zap, 
  Search, 
  Eye, 
  Shield, 
  Smartphone,
  Activity,
  Timer,
  Clock,
  TrendingUp,
  Sparkles,
  Target,
  Code,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import SchedulerModal from './SchedulerModal'

// Import all audit components
import {
  // Utilities
  fadeInUp,
  staggerContainer,
  calculateGrade,
  gradeColors,
  formatMs,
  
  // Score components
  ScoreCard,
  MetricCard,
  MiniMetricCard,
  ScoreGrid,
  
  // Issue components
  IssueItem,
  SecurityCheckRow,
  IssueList,
  IssueSection,
  
  // Header/Footer
  AuditHeader,
  AuditFooter,
  
  // Analysis sections
  BusinessImpactSection,
  IndustryComparisonSection,
  ResourceBreakdownSection,
  OpportunitiesSection,
  CodeSnippetsSection,
  AIInsightsSection,
  QuickWinsSection,
  
  // CTA components
  CTASection,
  FloatingActions,
  PriorityActionsCard
} from './audit'

export default function AuditPublicView({ audit, contact }) {
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [showScheduler, setShowScheduler] = useState(false)
  
  // Handle scroll for back to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  // Normalize scores - handle both flat properties and nested scores/summary object
  const summaryMetrics = audit.summary?.metrics || {}
  const scores = {
    performance: audit.performanceScore ?? summaryMetrics.performance ?? null,
    seo: audit.seoScore ?? summaryMetrics.seo ?? null,
    accessibility: audit.accessibilityScore ?? summaryMetrics.accessibility ?? null,
    bestPractices: audit.bestPracticesScore ?? summaryMetrics.bestPractices ?? null,
    pwa: audit.pwaScore ?? summaryMetrics.pwa ?? null,
    security: audit.securityScore ?? summaryMetrics.security ?? null,
    overall: audit.overallScore ?? summaryMetrics.overall ?? null
  }
  
  // Calculate grade
  const grade = audit.grade || calculateGrade({ 
    performanceScore: scores.performance,
    seoScore: scores.seo,
    accessibilityScore: scores.accessibility,
    bestPracticesScore: scores.bestPractices
  })
  const gradeColor = gradeColors[grade] || gradeColors['N/A']
  
  // Extract data from summary or fullAuditJson
  const summary = audit.summary || {}
  const fullAuditData = typeof audit.fullAuditJson === 'string' 
    ? (JSON.parse(audit.fullAuditJson || '{}') || {}) 
    : (audit.fullAuditJson || {})
  
  // Issue data
  const seoIssues = audit.seoIssues || summary.seoIssues || fullAuditData.seoIssues || []
  const securityIssues = audit.securityIssues || summary.securityIssues || fullAuditData.securityIssues || {}
  const performanceIssues = audit.performanceIssues || summary.performanceIssues || fullAuditData.performanceIssues || []
  const accessibilityIssues = audit.accessibilityIssues || summary.accessibilityIssues || fullAuditData.accessibilityIssues || []
  const priorityActions = audit.priorityActions || summary.priorityActions || fullAuditData.priorityActions || []
  const insightsSummary = audit.insightsSummary || summary.insightsSummary || fullAuditData.insightsSummary || null
  
  // Enhanced audit data
  const quickWins = summary.quickWins || fullAuditData.quickWins || []
  const resources = summary.resources || fullAuditData.resources || {}
  const opportunities = summary.opportunities || fullAuditData.opportunities || []
  const businessImpact = summary.businessImpact || fullAuditData.businessImpact || {}
  const industryComparison = summary.industryComparison || fullAuditData.industryComparison || {}
  const codeSnippets = summary.codeSnippets || fullAuditData.codeSnippets || []
  const aiInsights = summary.aiInsights || fullAuditData.aiInsights || null
  const schemaMarkup = summary.schemaMarkup || fullAuditData.schemaMarkup || null
  
  // Scroll to section helper
  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  
  const projectLogo = audit.project?.logoUrl
  const projectTitle = audit.project?.title

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      {/* Header - uses Upforge project logo_url from settings */}
      <AuditHeader 
        audit={audit}
        contact={contact}
        grade={grade}
        gradeColor={gradeColor}
        logoUrl={projectLogo}
        brandName={projectTitle}
      />

      {/* Score Cards Grid */}
      <ScoreGrid>
        <ScoreCard 
          label="Performance" 
          value={scores.performance} 
          icon={Zap}
          description="Page speed & responsiveness"
        />
        <ScoreCard 
          label="SEO" 
          value={scores.seo} 
          icon={Search}
          description="Search engine optimization"
        />
        <ScoreCard 
          label="Accessibility" 
          value={scores.accessibility} 
          icon={Eye}
          description="Usability for all users"
        />
        <ScoreCard 
          label="Best Practices" 
          value={scores.bestPractices} 
          icon={Shield}
          description="Security & modern standards"
        />
        <ScoreCard 
          label="PWA" 
          value={scores.pwa} 
          icon={Smartphone}
          description="Progressive Web App"
        />
      </ScoreGrid>

      {/* Main Content */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8"
      >
        {/* Core Web Vitals Section */}
        <CoreWebVitalsSection audit={audit} />

        {/* SEO Issues */}
        {seoIssues.length > 0 && (
          <IssueSection
            id="seo-issues"
            title="SEO Analysis"
            description="Issues affecting your search engine visibility"
            icon={Search}
            iconColor="text-[var(--brand-primary)]"
            iconBg="bg-[var(--brand-primary)]/10"
            shadowColor="hover:shadow-[var(--brand-primary)]/5"
          >
            <IssueList>
              {seoIssues.map((issue, i) => (
                <IssueItem key={i} {...issue} />
              ))}
            </IssueList>
          </IssueSection>
        )}

        {/* Schema Markup Analysis */}
        {schemaMarkup && (
          <IssueSection
            id="schema-markup"
            title="Structured Data (Schema Markup)"
            description="Rich snippets and search appearance optimization"
            icon={Code}
            iconColor="text-[var(--brand-primary)]"
            iconBg="bg-[var(--brand-primary)]/10"
            shadowColor="hover:shadow-[var(--brand-primary)]/5"
          >
            <motion.div 
              variants={staggerContainer} 
              initial="hidden" 
              whileInView="visible" 
              viewport={{ once: true }} 
              className="space-y-4"
            >
              {/* Schema Score */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-[var(--surface-secondary)]">
                <div className={`text-3xl font-bold ${schemaMarkup.score >= 70 ? 'text-[var(--accent-green)]' : schemaMarkup.score >= 40 ? 'text-[var(--accent-orange)]' : 'text-[var(--accent-red)]'}`}>
                  {schemaMarkup.score || 0}/100
                </div>
                <div>
                  <div className="font-medium text-[var(--text-primary)]">Schema Score</div>
                  <div className="text-sm text-[var(--text-muted)]">
                    {schemaMarkup.found 
                      ? `${schemaMarkup.count || 0} schema block${schemaMarkup.count !== 1 ? 's' : ''} detected`
                      : 'No structured data found'}
                  </div>
                </div>
              </div>

              {/* Detected Schema Types */}
              {schemaMarkup.types && schemaMarkup.types.length > 0 && (
                <div className="p-4 rounded-lg bg-[var(--surface-secondary)]">
                  <h4 className="font-medium text-[var(--text-primary)] mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent-green)]" />
                    Detected Schema Types
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {schemaMarkup.types.map((type, i) => (
                      <span 
                        key={i}
                        className="px-3 py-1 rounded-full text-sm bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-medium"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Schemas */}
              {schemaMarkup.recommended && schemaMarkup.recommended.length > 0 && (
                <div className="p-4 rounded-lg bg-[var(--accent-orange)]/5 border border-[var(--accent-orange)]/20">
                  <h4 className="font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[var(--accent-orange)]" />
                    Recommended Schema Types
                  </h4>
                  <div className="space-y-2">
                    {schemaMarkup.recommended.map((rec, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="px-2 py-1 rounded text-xs font-medium bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]">
                          {rec.type}
                        </div>
                        <span className="text-sm text-[var(--text-muted)]">{rec.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schema Details */}
              {schemaMarkup.details && schemaMarkup.details.length > 0 && (
                <div className="p-4 rounded-lg bg-[var(--surface-secondary)]">
                  <h4 className="font-medium text-[var(--text-primary)] mb-3">Schema Details</h4>
                  <div className="space-y-3">
                    {schemaMarkup.details.slice(0, 5).map((detail, i) => (
                      <div key={i} className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--surface-page)]">
                        <div className="font-medium text-[var(--text-primary)] text-sm mb-1">{detail.type}</div>
                        <div className="flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                          {detail.name && <span className="px-2 py-0.5 rounded bg-[var(--surface-secondary)]">Name: {detail.name}</span>}
                          {detail.hasDescription && <span className="px-2 py-0.5 rounded bg-[var(--accent-green)]/10 text-[var(--accent-green)]">✓ Description</span>}
                          {detail.hasImage && <span className="px-2 py-0.5 rounded bg-[var(--accent-green)]/10 text-[var(--accent-green)]">✓ Image</span>}
                          {detail.hasAddress && <span className="px-2 py-0.5 rounded bg-[var(--accent-green)]/10 text-[var(--accent-green)]">✓ Address</span>}
                          {detail.hasRating && <span className="px-2 py-0.5 rounded bg-[var(--accent-green)]/10 text-[var(--accent-green)]">✓ Rating</span>}
                          {detail.hasReviews && <span className="px-2 py-0.5 rounded bg-[var(--accent-green)]/10 text-[var(--accent-green)]">✓ Reviews</span>}
                          {detail.hasHours && <span className="px-2 py-0.5 rounded bg-[var(--accent-green)]/10 text-[var(--accent-green)]">✓ Hours</span>}
                          {detail.hasSocialLinks && <span className="px-2 py-0.5 rounded bg-[var(--accent-green)]/10 text-[var(--accent-green)]">✓ Social Links</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Schema Warning */}
              {!schemaMarkup.found && (
                <div className="p-4 rounded-lg bg-[var(--accent-red)]/5 border border-[var(--accent-red)]/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-[var(--accent-red)] flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">No Structured Data Found</div>
                      <p className="text-sm text-[var(--text-muted)] mt-1">
                        Your website is missing JSON-LD structured data. Adding schema markup helps search engines 
                        understand your content and can enable rich snippets in search results (star ratings, 
                        FAQs, breadcrumbs, etc.).
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </IssueSection>
        )}

        {/* Security Analysis */}
        <IssueSection
          id="security-issues"
          title="Security Analysis"
          description="Security headers and HTTPS configuration"
          icon={Shield}
          iconColor="text-[var(--accent-green)]"
          iconBg="bg-[var(--accent-green)]/10"
          shadowColor="hover:shadow-[var(--accent-green)]/5"
        >
          <motion.div 
            variants={staggerContainer} 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true }} 
            className="grid md:grid-cols-2 gap-3"
          >
            <SecurityCheckRow name="HTTPS Enabled" status={securityIssues.https ?? true} />
            <SecurityCheckRow name="Content Security Policy" status={securityIssues.csp} />
            <SecurityCheckRow name="X-Frame-Options" status={securityIssues.xFrameOptions} />
            <SecurityCheckRow name="X-Content-Type-Options" status={securityIssues.xContentType} />
            <SecurityCheckRow name="Strict-Transport-Security" status={securityIssues.hsts} />
            <SecurityCheckRow name="Referrer-Policy" status={securityIssues.referrerPolicy} />
          </motion.div>
        </IssueSection>

        {/* Performance Issues */}
        {performanceIssues.length > 0 && (
          <IssueSection
            id="performance-issues"
            title="Performance Opportunities"
            description="Improvements that could speed up your website"
            icon={Zap}
            iconColor="text-[var(--accent-orange)]"
            iconBg="bg-[var(--accent-orange)]/10"
            shadowColor="hover:shadow-[var(--accent-orange)]/5"
          >
            <IssueList>
              {performanceIssues.map((issue, i) => (
                <IssueItem key={i} {...issue} />
              ))}
            </IssueList>
          </IssueSection>
        )}

        {/* Accessibility Issues */}
        {accessibilityIssues.length > 0 && (
          <IssueSection
            id="accessibility-issues"
            title="Accessibility Issues"
            description="Barriers that may prevent users from accessing your content"
            icon={Eye}
            iconColor="text-[var(--brand-primary)]"
            iconBg="bg-[var(--brand-primary)]/10"
            shadowColor="hover:shadow-[var(--brand-primary)]/5"
          >
            <IssueList>
              {accessibilityIssues.map((issue, i) => (
                <IssueItem key={i} {...issue} />
              ))}
            </IssueList>
          </IssueSection>
        )}

        {/* Priority Actions */}
        <PriorityActionsCard
          priorityActions={priorityActions}
          scores={scores}
          securityIssues={securityIssues}
          insightsSummary={insightsSummary}
          onScrollToSection={scrollToSection}
        />

        {/* Business Impact Analysis */}
        <BusinessImpactSection businessImpact={businessImpact} />

        {/* Industry Comparison */}
        <IndustryComparisonSection industryComparison={industryComparison} />

        {/* Resource Breakdown */}
        <ResourceBreakdownSection resources={resources} />

        {/* Performance Opportunities */}
        <OpportunitiesSection opportunities={opportunities} />

        {/* Quick Wins */}
        <QuickWinsSection quickWins={quickWins} />

        {/* Code Snippets */}
        <CodeSnippetsSection codeSnippets={codeSnippets} />

        {/* AI Insights */}
        <AIInsightsSection aiInsights={aiInsights} />

        {/* CTA Section */}
        <CTASection onScheduleClick={() => setShowScheduler(true)} />

        {/* Footer - uses project logo from settings */}
        <AuditFooter logoUrl={projectLogo} brandName={projectTitle} />
      </motion.div>

      {/* Floating Action Buttons */}
      <FloatingActions 
        show={showBackToTop}
        onScheduleClick={() => setShowScheduler(true)}
        onBackToTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      />

      {/* Scheduler Modal */}
      <SchedulerModal
        isOpen={showScheduler}
        onClose={() => setShowScheduler(false)}
        title="Review Your Audit Results"
        defaultMeetingType="audit"
        auditContext={{
          auditId: audit.id,
          targetUrl: audit.targetUrl,
          grade: grade
        }}
        prefillData={contact ? {
          name: contact.name || '',
          email: contact.email || '',
          company: contact.company || ''
        } : null}
      />
    </div>
  )
}

/**
 * CWV score helpers - use Google's thresholds: Good / Needs Improvement / Poor
 * LCP: Good < 2.5s, Needs Improvement 2.5-4s, Poor > 4s
 * FCP: Good < 1.8s, Needs Improvement 1.8-3s, Poor > 3s
 */
function getLcpScore(ms) {
  if (ms < 2500) return 100
  if (ms < 4000) return 50
  return 0
}
function getFcpScore(ms) {
  if (ms < 1800) return 100
  if (ms < 3000) return 50
  return 0
}
function getClsScore(score) {
  if (score < 0.1) return 100
  if (score < 0.25) return 50
  return 0
}

/**
 * CoreWebVitalsSection - Extracted Core Web Vitals display
 */
function CoreWebVitalsSection({ audit }) {
  // Get metrics from multiple sources with fallbacks
  const metrics = audit.summary?.metrics || {}
  
  const lcpMs = audit.lcpMs ?? metrics.lcpMs ?? null
  const fidMs = audit.fidMs ?? metrics.fidMs ?? null
  const clsScore = audit.clsScore ?? metrics.clsScore ?? null
  const fcpMs = audit.fcpMs ?? metrics.fcpMs ?? null
  const ttiMs = audit.ttiMs ?? metrics.ttiMs ?? null
  const tbtMs = audit.tbtMs ?? metrics.tbtMs ?? null
  const speedIndexMs = audit.speedIndexMs ?? metrics.speedIndexMs ?? null
  
  return (
    <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] overflow-hidden hover:shadow-xl hover:shadow-[var(--brand-primary)]/5 transition-shadow duration-500">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Core Web Vitals</CardTitle>
              <CardDescription>Key metrics that Google uses to evaluate user experience</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Main CWV metrics */}
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <MetricCard 
              name="Largest Contentful Paint (LCP)"
              value={formatMs(lcpMs)}
              target="< 2.5s"
              score={lcpMs != null ? getLcpScore(parseFloat(lcpMs)) : null}
            />
            <MetricCard 
              name="First Contentful Paint (FCP)"
              value={formatMs(fcpMs)}
              target="< 1.8s"
              score={fcpMs != null ? getFcpScore(parseFloat(fcpMs)) : null}
            />
            <MetricCard 
              name="Cumulative Layout Shift (CLS)"
              value={clsScore != null ? clsScore.toFixed(3) : 'N/A'}
              target="< 0.1"
              score={clsScore != null ? getClsScore(parseFloat(clsScore)) : null}
            />
            <MetricCard 
              name="Total Blocking Time (TBT)"
              value={formatMs(tbtMs)}
              target="< 200ms"
              score={tbtMs != null ? (Number(tbtMs) < 200 ? 95 : Number(tbtMs) < 600 ? 75 : 55) : null}
            />
          </motion.div>
          
          {/* Secondary metrics */}
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-4 mt-4"
          >
            <MiniMetricCard 
              icon={Timer}
              value={formatMs(ttiMs)}
              label="Time to Interactive"
            />
            <MiniMetricCard 
              icon={Clock}
              value={formatMs(speedIndexMs)}
              label="Speed Index"
            />
            <MiniMetricCard 
              icon={TrendingUp}
              value={lcpMs && fcpMs ? `${((lcpMs - fcpMs) / 1000).toFixed(1)}s` : 'N/A'}
              label="LCP - FCP Delta"
            />
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
