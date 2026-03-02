/**
 * Audit Header Component
 * Hero section with grade badge, branding, and audit metadata
 */
import { motion } from 'framer-motion'
import { 
  Globe, 
  ExternalLink, 
  Calendar, 
  Smartphone, 
  MonitorSmartphone 
} from 'lucide-react'
import { GradeBadge } from './ScoreCards'
import { slideInLeft, fadeInUp } from './utils'

/**
 * AuditHeader - Main header with gradient background and glass effects
 * Uses project.logoUrl and project.title from audit when available (Upforge project settings)
 */
export function AuditHeader({ 
  audit, 
  contact, 
  grade, 
  gradeColor,
  logoUrl,
  brandName 
}) {
  const logoSrc = logoUrl || audit?.project?.logoUrl || '/favicon.svg'
  const brand = brandName || audit?.project?.title || 'Upforge'

  return (
    <header className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-12 overflow-hidden">
      {/* Decorative gradient orbs - Liquid Glass effect */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--brand-primary)]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--brand-primary)]/20 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div className="flex-1">
            {/* Logo - uses project logo_url from settings */}
            <motion.div 
              variants={slideInLeft}
              initial="hidden"
              animate="visible"
              className="flex items-center gap-2 mb-6"
            >
              <img src={logoSrc} alt={brand} className="w-10 h-10" />
              <span className="font-semibold text-white/90 text-lg">{brand}</span>
            </motion.div>
            
            <h1 className="text-3xl font-bold mb-2">Website Audit Report</h1>
            
            {/* Target URL */}
            <div className="flex items-center gap-2 text-gray-300 text-lg">
              <Globe className="w-5 h-5" />
              <a 
                href={audit.targetUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-white transition-colors hover:underline underline-offset-2"
              >
                {audit.targetUrl}
              </a>
              <ExternalLink className="w-4 h-4" />
            </div>
            
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-gray-400 text-sm">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(audit.completedAt || audit.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
              <div className="flex items-center gap-1.5">
                {audit.deviceType === 'mobile' ? (
                  <Smartphone className="w-4 h-4" />
                ) : (
                  <MonitorSmartphone className="w-4 h-4" />
                )}
                {audit.deviceType === 'mobile' ? 'Mobile' : 'Desktop'} Analysis
              </div>
            </div>
            
            {/* Contact info */}
            {contact?.name && (
              <p className="text-gray-400 mt-3">
                Prepared for: <span className="text-white font-medium">{contact.name}</span>
                {contact.company && <span className="text-gray-500"> ({contact.company})</span>}
              </p>
            )}
          </div>
          
          {/* Grade Badge */}
          <GradeBadge grade={grade} gradeColor={gradeColor} />
        </motion.div>
      </div>
    </header>
  )
}

/**
 * SectionHeader - Consistent header for content sections
 */
export function SectionHeader({ 
  icon: Icon, 
  iconBg = 'bg-[var(--brand-primary)]/10',
  iconColor = 'text-[var(--brand-primary)]',
  title, 
  description,
  className = ''
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
        {description && (
          <p className="text-sm text-[var(--text-secondary)]">{description}</p>
        )}
      </div>
    </div>
  )
}

/**
 * AuditFooter - Footer with branding
 * Uses project logo_url and title from audit when available
 */
export function AuditFooter({ logoUrl, brandName }) {
  const logoSrc = logoUrl || '/favicon.svg'
  const brand = brandName || 'Upforge'

  return (
    <motion.footer 
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="text-center py-8 border-t border-[var(--glass-border)]"
    >
      <div className="flex items-center justify-center gap-2 mb-4">
        <img src={logoSrc} alt={brand} className="w-10 h-10" />
        <span className="font-semibold text-[var(--text-primary)] text-lg">{brand}</span>
      </div>
      <p className="text-[var(--text-tertiary)] text-sm">
        High-Performance Websites & Digital Marketing<br />
        Cincinnati & Northern Kentucky
      </p>
    </motion.footer>
  )
}
