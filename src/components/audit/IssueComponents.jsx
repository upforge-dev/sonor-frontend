/**
 * Issue Display Components
 * Liquid Glass styled components for showing audit issues
 */
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { 
  XCircle, 
  AlertTriangle, 
  Eye, 
  CheckCircle,
  Info
} from 'lucide-react'
import { fadeInUp, severityConfig, hoverSlide } from './utils'

/**
 * IssueItem - Single issue display with severity and recommendation
 * Used for SEO, Performance, and Accessibility issues
 */
export function IssueItem({ title, description, severity = 'info', recommendation }) {
  const config = severityConfig[severity] || severityConfig.info
  
  const icons = {
    critical: XCircle,
    warning: AlertTriangle,
    info: Eye
  }
  const IconComponent = icons[severity] || Info
  
  return (
    <motion.div 
      variants={fadeInUp}
      {...hoverSlide}
      className={`border-l-4 ${config.bg} p-4 rounded-r-xl hover:shadow-lg ${config.glow} transition-all duration-300`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
          <IconComponent className={`w-4 h-4 ${config.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-[var(--text-primary)]">{title}</h4>
          <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">{description}</p>
          {recommendation && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 flex items-start gap-2 p-2 bg-[var(--accent-green)]/5 rounded-lg"
            >
              <CheckCircle className="w-4 h-4 text-[var(--accent-green)] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[var(--accent-green)]">
                <span className="font-medium">Fix:</span> {recommendation}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/**
 * SecurityCheckRow - Security header status display
 * Shows enabled/missing status for security headers
 */
export function SecurityCheckRow({ name, status }) {
  return (
    <motion.div 
      variants={fadeInUp}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      className="flex items-center justify-between p-3 bg-[var(--glass-bg)] rounded-xl border border-[var(--glass-border)]
        hover:border-[var(--glass-border-strong)] transition-all duration-300"
    >
      <span className="text-sm font-medium text-[var(--text-primary)]">{name}</span>
      {status ? (
        <Badge className="bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-0 font-medium">
          <CheckCircle className="w-3 h-3 mr-1" />
          Enabled
        </Badge>
      ) : (
        <Badge className="bg-[var(--accent-red)]/10 text-[var(--accent-red)] border-0 font-medium">
          <XCircle className="w-3 h-3 mr-1" />
          Missing
        </Badge>
      )}
    </motion.div>
  )
}

/**
 * IssueList - Container for issue items with stagger animation
 */
export function IssueList({ children, className = '' }) {
  return (
    <motion.div 
      variants={{ 
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
      }}
      initial="hidden" 
      whileInView="visible" 
      viewport={{ once: true }} 
      className={`space-y-3 ${className}`}
    >
      {children}
    </motion.div>
  )
}

/**
 * IssueSection - Complete section wrapper for issue categories
 * Includes header, icon, and content area
 */
export function IssueSection({ 
  id, 
  title, 
  description, 
  icon: Icon, 
  iconColor = 'text-[var(--brand-primary)]',
  iconBg = 'bg-[var(--brand-primary)]/10',
  shadowColor = 'hover:shadow-[var(--brand-primary)]/5',
  children 
}) {
  return (
    <motion.div 
      id={id}
      variants={fadeInUp} 
      initial="hidden" 
      whileInView="visible" 
      viewport={{ once: true }}
    >
      <div className={`bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-2xl overflow-hidden hover:shadow-xl ${shadowColor} transition-shadow duration-500`}>
        <div className="p-6 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{description}</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </motion.div>
  )
}

/**
 * QuickWinItem - Simple checkmark item for quick wins
 */
export function QuickWinItem({ children }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
      <span className="text-green-100">{children}</span>
    </div>
  )
}
