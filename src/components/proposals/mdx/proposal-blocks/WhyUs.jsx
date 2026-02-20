import { CheckCircle, Award, Users, Shield, Zap, Target } from 'lucide-react'

/**
 * WhyUs - Displays reasons to choose the company
 * 
 * Usage:
 * <WhyUs 
 *   title="Why Choose Uptrade Media?"
 *   reasons={[
 *     { title: "Proven Results", description: "500+ successful projects" },
 *     { title: "Expert Team", description: "10+ years combined experience" }
 *   ]}
 * />
 */
export const WhyUs = ({ 
  title = "Why Choose Us?", 
  subtitle,
  reasons = [],
  layout = "grid", // "grid" | "list"
  children 
}) => {
  // Icon mapping for common keywords
  const getIcon = (reasonTitle) => {
    const lower = reasonTitle?.toLowerCase() || ''
    if (lower.includes('result') || lower.includes('proven') || lower.includes('track')) return Award
    if (lower.includes('team') || lower.includes('expert') || lower.includes('experience')) return Users
    if (lower.includes('trust') || lower.includes('secure') || lower.includes('reliable')) return Shield
    if (lower.includes('fast') || lower.includes('quick') || lower.includes('speed')) return Zap
    if (lower.includes('goal') || lower.includes('target') || lower.includes('focus')) return Target
    return CheckCircle
  }

  return (
    <div className="my-8 p-6 md:p-8 rounded-xl bg-gradient-to-br from-[var(--brand-primary)]/5 to-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
      </div>

      {/* Reasons Grid/List */}
      {reasons.length > 0 && (
        <div className={
          layout === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }>
          {reasons.map((reason, index) => {
            const Icon = getIcon(reason.title)
            
            return layout === 'grid' ? (
              <div 
                key={index}
                className="bg-[var(--surface-primary)] rounded-lg p-5 shadow-sm border border-[var(--glass-border)] hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-[var(--brand-primary)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                      {reason.title}
                    </h3>
                    {reason.description && (
                      <p className="text-sm text-[var(--text-secondary)]">
                        {reason.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div 
                key={index}
                className="flex items-start gap-4 p-4 bg-[var(--surface-primary)] rounded-lg border border-[var(--glass-border)]"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[var(--brand-primary)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    {reason.title}
                  </h3>
                  {reason.description && (
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      {reason.description}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Children for custom content */}
      {children && (
        <div className="mt-6 prose prose-sm max-w-none text-[var(--text-secondary)]">
          {children}
        </div>
      )}
    </div>
  )
}

export default WhyUs
