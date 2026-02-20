/**
 * Audit CTA and Action Components
 * Call-to-action sections and floating action buttons
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Phone, 
  ArrowUp
} from 'lucide-react'
import { fadeInUp } from './utils'

/**
 * CTASection - Call-to-action with consultation booking
 */
export function CTASection({ onScheduleClick }) {
  return (
    <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] overflow-hidden hover:shadow-xl hover:shadow-[var(--brand-primary)]/5 transition-shadow duration-500">
        <CardContent className="py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3">
              Need Help Fixing These Issues?
            </h2>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto mb-8 leading-relaxed">
              Our team specializes in website optimization and can help you implement these improvements to boost your rankings and conversions.
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button 
              onClick={onScheduleClick}
              className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white font-bold rounded-xl 
                hover:shadow-xl hover:shadow-[var(--brand-primary)]/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Schedule Free Consultation
            </button>
            <a 
              href="tel:+15139511110"
              className="group inline-flex items-center justify-center px-8 py-4 bg-[var(--glass-bg-elevated)] text-[var(--text-primary)] font-bold rounded-xl border border-[var(--glass-border)] 
                hover:bg-[var(--glass-bg-hover)] hover:border-[var(--brand-primary)]/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              <Phone className="w-5 h-5 mr-2" />
              Call (513) 951-1110
            </a>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/**
 * FloatingActions - Floating action buttons for quick access
 */
export function FloatingActions({ show, onScheduleClick, onBackToTop }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-50 flex flex-col gap-3"
        >
          {/* Schedule Consultation FAB */}
          <motion.button
            onClick={onScheduleClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white font-semibold rounded-full shadow-lg shadow-[var(--brand-primary)]/30 hover:shadow-xl transition-shadow"
          >
            <Calendar className="w-5 h-5" />
            <span className="hidden sm:inline">Schedule Consultation</span>
          </motion.button>
          
          {/* Back to Top Button */}
          <Button
            onClick={onBackToTop}
            className="rounded-full w-12 h-12 bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)] shadow-lg hover:scale-110 transition-all self-end"
            size="sm"
          >
            <ArrowUp className="w-5 h-5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * PriorityActionsSection - Top recommendations with clickable navigation
 */
export function PriorityActionsCard({ 
  priorityActions, 
  scores, 
  securityIssues, 
  insightsSummary,
  onScrollToSection 
}) {
  return (
    <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <Card className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden border-0 shadow-2xl">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-primary)]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--brand-primary)]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center shadow-lg shadow-[var(--brand-primary)]/30">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Priority Action Items</h3>
              <p className="text-sm text-gray-400">Top recommendations to improve your website</p>
            </div>
          </div>
        </div>
        
        <div className="relative p-6">
          {/* AI insights summary */}
          {insightsSummary && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-6 p-5 bg-gradient-to-r from-[var(--brand-primary)]/10 to-[var(--brand-primary)]/10 rounded-2xl border border-white/10 backdrop-blur-sm"
            >
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[var(--brand-primary)] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <p className="text-gray-200 text-sm leading-relaxed">{insightsSummary}</p>
              </div>
            </motion.div>
          )}
          
          <div className="space-y-4">
            {/* Use API priority actions if available */}
            {priorityActions?.length > 0 ? (
              priorityActions.map((action, index) => (
                <PriorityActionItem 
                  key={index} 
                  index={index} 
                  action={action}
                />
              ))
            ) : (
              <GeneratedPriorityActions 
                scores={scores}
                securityIssues={securityIssues}
                onScrollToSection={onScrollToSection}
              />
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

/**
 * PriorityActionItem - Single priority action display
 * Handles both string format (legacy) and object format (AI insights: {issue, impact, effort})
 */
function PriorityActionItem({ index, action }) {
  // Handle both string and object formats
  const isObject = typeof action === 'object' && action !== null
  const title = isObject ? action.issue : action
  const impact = isObject ? action.impact : null
  const effort = isObject ? action.effort : null
  
  return (
    <motion.div 
      variants={fadeInUp}
      whileHover={{ x: 4, transition: { duration: 0.2 } }}
      className="flex items-start gap-4 bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-colors duration-300 border border-white/5"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[var(--brand-primary)]/20">
        <span className="text-white font-bold text-sm">{index + 1}</span>
      </div>
      <div className="flex-1">
        <p className="text-gray-200 text-sm leading-relaxed">{title}</p>
        {(impact || effort) && (
          <div className="flex gap-3 mt-2">
            {impact && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                impact === 'High' ? 'bg-red-500/20 text-red-300' :
                impact === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-green-500/20 text-green-300'
              }`}>
                {impact} Impact
              </span>
            )}
            {effort && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                effort === 'Hard' ? 'bg-purple-500/20 text-purple-300' :
                effort === 'Medium' ? 'bg-blue-500/20 text-blue-300' :
                'bg-cyan-500/20 text-cyan-300'
              }`}>
                {effort} Effort
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

/**
 * GeneratedPriorityActions - Auto-generated actions based on scores
 */
function GeneratedPriorityActions({ scores, securityIssues, onScrollToSection }) {
  const actions = []
  
  if (scores?.performance < 70) {
    actions.push({
      id: 'performance-issues',
      color: 'var(--accent-red)',
      title: 'Improve Page Speed',
      description: `Your performance score of ${scores.performance} is below optimal. Consider optimizing images, minifying CSS/JS, and implementing lazy loading.`
    })
  }
  
  if (scores?.seo < 80) {
    actions.push({
      id: 'seo-issues',
      color: 'var(--accent-orange)',
      title: 'Optimize for Search Engines',
      description: 'Your SEO score could be improved. Ensure meta descriptions, title tags, and structured data are properly configured.'
    })
  }
  
  if (scores?.accessibility < 90) {
    actions.push({
      id: 'accessibility-issues',
      color: 'var(--brand-primary)',
      title: 'Improve Accessibility',
      description: 'Make your site more accessible by adding alt text to images, ensuring sufficient color contrast, and using proper heading hierarchy.'
    })
  }
  
  if (securityIssues?.csp === false || securityIssues?.xFrameOptions === false || securityIssues?.hsts === false) {
    actions.push({
      id: 'security-issues',
      color: 'var(--accent-green)',
      title: 'Strengthen Security Headers',
      description: 'Some security headers are missing. Adding CSP, X-Frame-Options, and HSTS headers will protect against common attacks.'
    })
  }
  
  // Show success message if all scores are good
  if (actions.length === 0 && scores?.performance >= 70 && scores?.seo >= 80 && scores?.accessibility >= 90) {
    return (
      <motion.div 
        variants={fadeInUp} 
        className="flex items-start gap-4 bg-[var(--accent-green)]/10 rounded-xl p-4 border border-[var(--accent-green)]/20"
      >
        <div className="w-8 h-8 rounded-full bg-[var(--accent-green)]/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-[var(--accent-green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h4 className="font-semibold text-white">Great Job!</h4>
          <p className="text-gray-400 text-sm mt-1 leading-relaxed">
            Your website is performing well across all major categories. Keep monitoring and optimizing for best results.
          </p>
        </div>
      </motion.div>
    )
  }
  
  return (
    <>
      {actions.map((action, index) => (
        <motion.div 
          key={action.id}
          variants={fadeInUp} 
          className="flex items-start gap-4 bg-white/5 rounded-xl p-4 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
          onClick={() => onScrollToSection?.(action.id)}
        >
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${action.color}20` }}
          >
            <span style={{ color: action.color }} className="font-bold">{index + 1}</span>
          </div>
          <div>
            <h4 className="font-semibold text-white">{action.title}</h4>
            <p className="text-gray-400 text-sm mt-1 leading-relaxed">{action.description}</p>
            <span className="text-xs text-[var(--brand-primary)] mt-2 inline-block">Click to see details ↓</span>
          </div>
        </motion.div>
      ))}
    </>
  )
}
