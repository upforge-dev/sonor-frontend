import { AlertTriangle, AlertCircle, AlertOctagon } from 'lucide-react'

/**
 * Critical Issues Block — Liquid Glass Design
 * Matches the premium glass aesthetic used across all proposal sections.
 */

const liquidGlassBase = `
  relative
  bg-gradient-to-br from-white/10 to-white/5
  backdrop-blur-xl
  border border-white/20
  shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.2)]
  rounded-3xl
`

export function CriticalIssues({ children, issues, title = 'Critical Digital Gaps' }) {
  return (
    <div className={`${liquidGlassBase} p-8 md:p-10 my-10`}>
      {/* Subtle red glow for urgency */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/10 rounded-full blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <span className="text-sm uppercase tracking-widest text-red-400 block">Attention Required</span>
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">{title}</h2>
          </div>
        </div>

        <div className="space-y-4">
          {issues
            ? issues.map((issue, i) => (
                <IssueCard key={i} title={issue.title} description={issue.description} severity={issue.severity} />
              ))
            : children}
        </div>
      </div>
    </div>
  )
}

export function IssueCard({ title, description, severity = 'high' }) {
  const severityConfig = {
    critical: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      icon: AlertOctagon,
      iconColor: 'text-red-400',
      badge: 'Critical',
      badgeBg: 'bg-red-500/20 text-red-400',
    },
    high: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
      badge: 'High',
      badgeBg: 'bg-amber-500/20 text-amber-400',
    },
    medium: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      icon: AlertCircle,
      iconColor: 'text-yellow-400',
      badge: 'Medium',
      badgeBg: 'bg-yellow-500/20 text-yellow-400',
    },
  }

  const config = severityConfig[severity] || severityConfig.high
  const Icon = config.icon

  return (
    <div className={`flex items-start gap-4 p-4 rounded-2xl ${config.bg} border ${config.border}`}>
      <div className="flex-shrink-0 mt-0.5">
        <Icon className={`w-5 h-5 ${config.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-[var(--text-primary)]">{title}</h4>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.badgeBg}`}>
            {config.badge}
          </span>
        </div>
        {description && (
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  )
}

export default CriticalIssues
