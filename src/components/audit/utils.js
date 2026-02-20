/**
 * Audit Component Utilities
 * Shared animation variants, helpers, and constants following Portal Design Guide
 */

// ============================================================================
// Animation Constants (from Portal Design Guide)
// ============================================================================
export const animationDuration = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
}

export const animationEasing = {
  default: [0.4, 0, 0.2, 1],
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  spring: [0.175, 0.885, 0.32, 1.275],
  liquidGlass: [0.25, 0.46, 0.45, 0.94], // Apple-style smooth
}

// ============================================================================
// Animation Variants (Liquid Glass)
// ============================================================================
export const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: animationDuration.slow, 
      ease: animationEasing.liquidGlass 
    } 
  }
}

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { 
      duration: animationDuration.normal, 
      ease: animationEasing.easeOut 
    } 
  }
}

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { 
      staggerChildren: 0.08, 
      delayChildren: 0.1 
    }
  }
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    transition: { 
      type: 'spring', 
      stiffness: 300, 
      damping: 25 
    } 
  }
}

export const slideInLeft = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { 
      duration: animationDuration.normal, 
      ease: animationEasing.easeOut 
    } 
  }
}

export const glassReveal = {
  hidden: { opacity: 0, backdropFilter: 'blur(0px)' },
  visible: { 
    opacity: 1, 
    backdropFilter: 'blur(20px)',
    transition: { 
      duration: animationDuration.slow, 
      ease: animationEasing.liquidGlass 
    } 
  }
}

// ============================================================================
// Score Utilities
// ============================================================================
export const getScoreColor = (score) => {
  if (score == null) return { 
    bg: 'bg-gray-500/10', 
    text: 'text-gray-400', 
    label: 'N/A',
    gradient: 'from-gray-400 to-gray-500'
  }
  if (score >= 90) return { 
    bg: 'bg-[var(--accent-green)]/10', 
    text: 'text-[var(--accent-green)]', 
    label: 'Excellent',
    gradient: 'from-emerald-400 to-green-500'
  }
  if (score >= 70) return { 
    bg: 'bg-[var(--accent-orange)]/10', 
    text: 'text-[var(--accent-orange)]', 
    label: 'Needs Work',
    gradient: 'from-amber-400 to-orange-500'
  }
  return { 
    bg: 'bg-[var(--accent-red)]/10', 
    text: 'text-[var(--accent-red)]', 
    label: 'Poor',
    gradient: 'from-red-400 to-rose-500'
  }
}

export const gradeColors = {
  'A': 'from-[var(--accent-green)] to-emerald-600',
  'B': 'from-[var(--brand-primary)] to-teal-600',
  'C': 'from-[var(--accent-orange)] to-amber-600',
  'D': 'from-orange-500 to-orange-600',
  'F': 'from-[var(--accent-red)] to-red-600',
  'N/A': 'from-gray-400 to-gray-500'
}

export const calculateGrade = (audit) => {
  const scores = [
    audit.performanceScore,
    audit.seoScore,
    audit.accessibilityScore,
    audit.bestPracticesScore
  ].filter(s => s != null)
  
  if (scores.length === 0) return 'N/A'
  
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  if (avg >= 90) return 'A'
  if (avg >= 80) return 'B'
  if (avg >= 70) return 'C'
  if (avg >= 60) return 'D'
  return 'F'
}

// ============================================================================
// Formatting Utilities
// ============================================================================
export const formatMs = (ms) => {
  if (ms == null) return 'N/A'
  const num = parseFloat(ms)
  if (isNaN(num)) return 'N/A'
  if (num >= 1000) return `${(num / 1000).toFixed(1)}s`
  return `${Math.round(num)}ms`
}

export const formatBytes = (bytes) => {
  if (bytes == null || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export const truncateUrl = (url, maxLength = 30) => {
  if (!url) return ''
  const filename = url.split('/').pop() || url
  if (filename.length <= maxLength) return filename
  return filename.substring(0, maxLength - 3) + '...'
}

export const extractHostname = (url) => {
  try {
    return new URL(url).hostname
  } catch {
    return url.substring(0, 20)
  }
}

// ============================================================================
// Severity Configuration
// ============================================================================
export const severityConfig = {
  critical: { 
    bg: 'border-l-[var(--accent-red)] bg-[var(--accent-red)]/5', 
    iconColor: 'text-[var(--accent-red)]', 
    glow: 'hover:shadow-[var(--accent-red)]/10',
    badge: 'bg-[var(--accent-red)]/10 text-[var(--accent-red)]'
  },
  warning: { 
    bg: 'border-l-[var(--accent-orange)] bg-[var(--accent-orange)]/5', 
    iconColor: 'text-[var(--accent-orange)]', 
    glow: 'hover:shadow-[var(--accent-orange)]/10',
    badge: 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]'
  },
  info: { 
    bg: 'border-l-[var(--brand-primary)] bg-[var(--brand-primary)]/5', 
    iconColor: 'text-[var(--brand-primary)]', 
    glow: 'hover:shadow-[var(--brand-primary)]/10',
    badge: 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
  }
}

// ============================================================================
// CSS Class Helpers (Liquid Glass Design System)
// ============================================================================
export const glassCard = `
  bg-[var(--glass-bg)] 
  backdrop-blur-xl 
  border border-[var(--glass-border)] 
  rounded-2xl
  transition-all duration-300
  hover:shadow-xl hover:shadow-[var(--brand-primary)]/5
  hover:border-[var(--glass-border-strong)]
`

export const glassButton = `
  px-4 py-2 
  bg-[var(--glass-bg-elevated)] 
  border border-[var(--glass-border)] 
  rounded-xl
  text-[var(--text-primary)]
  font-medium
  transition-all duration-200
  hover:bg-[var(--glass-bg-hover)]
  hover:border-[var(--brand-primary)]/30
  hover:scale-[1.02]
  active:scale-[0.98]
`

export const glassPrimary = `
  px-6 py-3
  bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)]
  text-white font-bold
  rounded-xl
  transition-all duration-200
  hover:shadow-xl hover:shadow-[var(--brand-primary)]/30
  hover:scale-[1.02]
  active:scale-[0.98]
`

// ============================================================================
// Hover Interaction Variants
// ============================================================================
export const hoverLift = {
  whileHover: { y: -4, transition: { duration: 0.2 } }
}

export const hoverScale = {
  whileHover: { scale: 1.02, transition: { duration: 0.2 } },
  whileTap: { scale: 0.98 }
}

export const hoverSlide = {
  whileHover: { x: 4, transition: { duration: 0.2 } }
}
