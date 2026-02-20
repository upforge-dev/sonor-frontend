/**
 * Audit Analysis Section Components
 * BusinessImpact, IndustryComparison, ResourceBreakdown, Opportunities, CodeSnippets, AIInsights
 */
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  TrendingUp, 
  BarChart3, 
  FileCode, 
  Lightbulb, 
  Code,
  Globe,
  Sparkles,
  Image as ImageIcon,
  Copy,
  CheckCircle
} from 'lucide-react'
import { fadeInUp, staggerContainer, extractHostname, truncateUrl } from './utils'
import { useState } from 'react'

/**
 * BusinessImpactSection - Shows estimated business impact of performance issues
 */
export function BusinessImpactSection({ businessImpact }) {
  if (!businessImpact?.details?.length) return null
  
  return (
    <motion.div id="business-impact" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <Card className="bg-gradient-to-br from-amber-900/20 via-orange-900/10 to-red-900/20 backdrop-blur-xl border-amber-500/20 overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-white">Business Impact Analysis</CardTitle>
              <CardDescription className="text-amber-200/70">How performance affects your bottom line</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {businessImpact.summary && (
            <p className="text-amber-100/90 mb-6 leading-relaxed">{businessImpact.summary}</p>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            {businessImpact.details.map((detail, i) => (
              <div 
                key={i} 
                className={`p-4 rounded-xl border ${
                  detail.severity === 'critical' 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-white font-medium">{detail.metric}</span>
                  <span className={`text-sm px-2 py-0.5 rounded ${
                    detail.severity === 'critical' 
                      ? 'bg-red-500/20 text-red-300' 
                      : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {detail.value}
                  </span>
                </div>
                <p className="text-gray-300 text-sm">{detail.impact}</p>
                <p className="text-gray-500 text-xs mt-1">Target: {detail.target}</p>
              </div>
            ))}
          </div>
          
          {/* Estimated Impact Summary */}
          {(businessImpact.estimatedBounceIncrease > 0 || businessImpact.estimatedConversionLoss > 0) && (
            <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <h4 className="text-white font-medium mb-3">Estimated Impact</h4>
              <div className="grid grid-cols-2 gap-4">
                {businessImpact.estimatedBounceIncrease > 0 && (
                  <div>
                    <span className="text-3xl font-bold text-red-400">~{businessImpact.estimatedBounceIncrease}%</span>
                    <p className="text-gray-400 text-sm">Higher bounce rate</p>
                  </div>
                )}
                {businessImpact.estimatedConversionLoss > 0 && (
                  <div>
                    <span className="text-3xl font-bold text-amber-400">~{businessImpact.estimatedConversionLoss}%</span>
                    <p className="text-gray-400 text-sm">Lost conversions</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/**
 * IndustryComparisonSection - Shows how site compares to industry benchmarks
 */
export function IndustryComparisonSection({ industryComparison }) {
  if (!industryComparison?.comparisons?.length) return null
  
  return (
    <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[var(--brand-primary)]" />
            </div>
            <div>
              <CardTitle>Industry Comparison</CardTitle>
              <CardDescription>How you compare to {industryComparison.industry}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {industryComparison.summary && (
            <p className="text-[var(--text-secondary)] mb-6">{industryComparison.summary}</p>
          )}
          <div className="space-y-4">
            {industryComparison.comparisons.map((comp, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="w-28 text-sm text-[var(--text-secondary)]">{comp.metric}</span>
                <div className="flex-1 relative">
                  <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: `${Math.min(comp.score, 100)}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className={`h-full rounded-full ${
                        comp.diff >= 0 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-400' 
                          : 'bg-gradient-to-r from-red-500 to-orange-400'
                      }`}
                    />
                  </div>
                  {/* Industry average marker */}
                  <div 
                    className="absolute top-0 h-3 w-0.5 bg-white/60"
                    style={{ left: `${comp.benchmark}%` }}
                    title={`Industry avg: ${comp.benchmark}`}
                  />
                </div>
                <span className={`w-16 text-right font-medium ${
                  comp.diff >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {comp.diff >= 0 ? '+' : ''}{comp.diff}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">White line indicates industry average</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/**
 * ResourceBreakdownSection - Shows page weight breakdown by resource type
 */
export function ResourceBreakdownSection({ resources }) {
  if (!resources?.totals?.total || resources.totals.total <= 0) return null
  
  return (
    <motion.div id="resource-breakdown" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center">
              <FileCode className="w-5 h-5 text-[var(--brand-primary)]" />
            </div>
            <div>
              <CardTitle>Resource Breakdown</CardTitle>
              <CardDescription>What's making your page heavy ({Math.round(resources.totals.total)} KB total)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Heaviest Images */}
            {resources.heaviestImages?.length > 0 && (
              <ResourceList 
                title="Largest Images" 
                icon={ImageIcon}
                iconColor="text-[var(--brand-primary)]"
                total={resources.totals.images}
                items={resources.heaviestImages.slice(0, 3)}
                itemColor="text-[var(--brand-primary)]"
              />
            )}
            
            {/* Heaviest Scripts */}
            {resources.heaviestScripts?.length > 0 && (
              <ResourceList 
                title="Largest Scripts" 
                icon={Code}
                iconColor="text-yellow-400"
                total={resources.totals.scripts}
                items={resources.heaviestScripts.slice(0, 3)}
                itemColor="text-yellow-400"
              />
            )}
            
            {/* Third-party Resources */}
            {resources.thirdParty?.length > 0 && (
              <div className="md:col-span-2">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-red-400" />
                  Third-party Resources ({Math.round(resources.totals.thirdParty)} KB)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {resources.thirdParty.slice(0, 4).map((res, i) => (
                    <div key={i} className="text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                      <span className="text-gray-400 truncate block text-xs" title={res.url}>
                        {extractHostname(res.url)}
                      </span>
                      <span className="text-red-400 font-medium">{res.sizeFormatted}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/**
 * ResourceList - Helper component for resource breakdown
 */
function ResourceList({ title, icon: Icon, iconColor, total, items, itemColor }) {
  return (
    <div>
      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        {title} ({Math.round(total)} KB)
      </h4>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm bg-white/5 rounded-lg p-2">
            <span className="text-gray-400 truncate flex-1 mr-2" title={item.url}>
              {truncateUrl(item.url)}
            </span>
            <span className={`${itemColor} font-medium`}>{item.sizeFormatted}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * OpportunitiesSection - Performance opportunities with savings
 */
export function OpportunitiesSection({ opportunities }) {
  if (!opportunities?.length) return null
  
  return (
    <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <CardTitle>Performance Opportunities</CardTitle>
              <CardDescription>Specific optimizations with estimated savings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-3"
          >
            {opportunities.slice(0, 6).map((opp, i) => (
              <motion.div 
                key={i} 
                variants={fadeInUp}
                className="flex items-start gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-cyan-400 font-medium text-sm">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-white font-medium">{opp.title}</h4>
                    {opp.savings && (
                      <span className="text-cyan-400 text-sm font-medium whitespace-nowrap">{opp.savings}</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mt-1 line-clamp-2">{opp.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/**
 * CodeSnippetsSection - Copy-paste code fixes
 */
export function CodeSnippetsSection({ codeSnippets }) {
  if (!codeSnippets?.length) return null
  
  return (
    <motion.div id="code-snippets" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center">
              <Code className="w-5 h-5 text-[var(--brand-primary)]" />
            </div>
            <div>
              <CardTitle>Ready-to-Use Code Fixes</CardTitle>
              <CardDescription>Copy-paste solutions for common issues</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {codeSnippets.map((snippet, i) => (
              <CodeSnippetCard key={i} snippet={snippet} />
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/**
 * CodeSnippetCard - Individual code snippet with copy functionality
 */
function CodeSnippetCard({ snippet }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
  
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-white/5 border-b border-white/10">
        <div>
          <h4 className="text-white font-medium">{snippet.title}</h4>
          <p className="text-gray-400 text-sm">{snippet.description}</p>
        </div>
        <button 
          onClick={handleCopy}
          className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 flex items-center gap-1 ${
            copied 
              ? 'bg-green-500/20 text-green-300' 
              : 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/30'
          }`}
        >
          {copied ? (
            <>
              <CheckCircle className="w-3 h-3" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 bg-gray-900/50 text-sm overflow-x-auto">
        <code className="text-gray-300">{snippet.code}</code>
      </pre>
    </div>
  )
}

/**
 * AIInsightsSection - AI-generated analysis
 */
export function AIInsightsSection({ aiInsights }) {
  if (!aiInsights) return null
  
  return (
    <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <Card className="bg-gradient-to-br from-[var(--brand-primary)]/20 via-[var(--brand-primary)]/10 to-emerald-900/20 backdrop-blur-xl border-[var(--brand-primary)]/20 overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center shadow-lg shadow-[var(--brand-primary)]/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-white">AI-Powered Analysis</CardTitle>
              <CardDescription className="text-[var(--brand-primary)]/70">Expert insights generated by AI</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {aiInsights.executiveSummary && (
            <AIInsightCard 
              title="Executive Summary" 
              content={aiInsights.executiveSummary}
            />
          )}
          {aiInsights.competitiveAnalysis && (
            <AIInsightCard 
              title="Competitive Analysis" 
              content={aiInsights.competitiveAnalysis}
            />
          )}
          {aiInsights.technicalDebt && (
            <AIInsightCard 
              title="Technical Debt" 
              content={aiInsights.technicalDebt}
            />
          )}
          {aiInsights.estimatedROI && (
            <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
              <h4 className="text-green-300 font-medium mb-3">Estimated ROI</h4>
              {typeof aiInsights.estimatedROI === 'string' ? (
                <p className="text-gray-300 text-sm">{aiInsights.estimatedROI}</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  {aiInsights.estimatedROI.performanceGain && (
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <p className="text-xs text-green-400 mb-1">Performance Gain</p>
                      <p className="text-sm text-gray-200">{aiInsights.estimatedROI.performanceGain}</p>
                    </div>
                  )}
                  {aiInsights.estimatedROI.seoImpact && (
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <p className="text-xs text-blue-400 mb-1">SEO Impact</p>
                      <p className="text-sm text-gray-200">{aiInsights.estimatedROI.seoImpact}</p>
                    </div>
                  )}
                  {aiInsights.estimatedROI.conversionImpact && (
                    <div className="p-3 bg-purple-500/10 rounded-lg">
                      <p className="text-xs text-purple-400 mb-1">Conversion Impact</p>
                      <p className="text-sm text-gray-200">{aiInsights.estimatedROI.conversionImpact}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/**
 * AIInsightCard - Individual AI insight card
 */
function AIInsightCard({ title, content }) {
  return (
    <div className="p-4 bg-white/5 rounded-xl border border-[var(--brand-primary)]/20">
      <h4 className="text-[var(--brand-primary)] font-medium mb-2">{title}</h4>
      <p className="text-gray-300 text-sm leading-relaxed">{content}</p>
    </div>
  )
}

/**
 * QuickWinsSection - Fast fixes that can be implemented quickly
 * Handles both string format (legacy) and object format (AI insights: {fix, expectedImpact})
 */
export function QuickWinsSection({ quickWins }) {
  if (!quickWins?.length) return null
  
  return (
    <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 backdrop-blur-xl border-green-500/20 overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <CardTitle className="text-white">Quick Wins</CardTitle>
              <CardDescription className="text-green-200/70">Fixes you can implement in under an hour</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {quickWins.map((win, i) => {
              // Handle both string and object formats
              const isObject = typeof win === 'object' && win !== null
              const fixText = isObject ? win.fix : win
              const expectedImpact = isObject ? win.expectedImpact : null
              
              return (
                <div key={i} className="flex items-start gap-3 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-green-100">{fixText}</span>
                    {expectedImpact && (
                      <p className="text-sm text-green-300/70 mt-1">
                        <span className="text-green-400">Expected impact:</span> {expectedImpact}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
