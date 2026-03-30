import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  ArrowRight, 
  Sparkles,
  Shield,
  Clock,
  Users,
  TrendingUp,
  Zap,
  Award,
  Target,
  BarChart3,
  Globe,
  Smartphone,
  Search,
  Mail,
  Calendar,
  ExternalLink,
  AlertCircle,
  Layers
} from 'lucide-react'

/**
 * Value Stack Component
 * Shows stacked value proposition with visual hierarchy
 */
export function ValueStack({ items = [] }) {
  return (
    <div className="my-12">
      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-[var(--brand-primary)]" />
        What You're Getting
      </h3>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div 
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--brand-primary)]/30 transition-all"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-[var(--brand-primary)]" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-[var(--text-primary)]">{item.title}</div>
              {item.value && (
                <div className="text-sm text-[var(--text-secondary)]">Value: ${item.value}</div>
              )}
            </div>
            {item.included !== false && (
              <Badge className="bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-0">
                Included
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Guarantee Badge Component
 * Trust-building guarantee display
 */
export function GuaranteeBadge({ title, description, icon: Icon = Shield }) {
  return (
    <div className="my-8 p-6 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)]/5 to-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-[var(--brand-primary)]/20 flex items-center justify-center">
          <Icon className="w-7 h-7 text-[var(--brand-primary)]" />
        </div>
        <div>
          <h4 className="text-lg font-bold text-[var(--text-primary)] mb-1">{title}</h4>
          <p className="text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Urgency Banner Component
 * Creates urgency with countdown/limited availability
 */
export function UrgencyBanner({ message, type = 'warning', icon: Icon = Clock }) {
  const typeStyles = {
    warning: 'bg-[var(--accent-orange)]/10 border-[var(--accent-orange)]/30 text-[var(--accent-orange)]',
    danger: 'bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30 text-[var(--accent-red)]',
    info: 'bg-[var(--accent-blue)]/10 border-[var(--accent-blue)]/30 text-[var(--accent-blue)]'
  }

  return (
    <div className={`my-6 p-4 rounded-xl border ${typeStyles[type]} flex items-center gap-3`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="font-medium">{message}</span>
    </div>
  )
}

/**
 * Testimonial Card Component
 * Social proof display
 */
export function Testimonial({ quote, author, company, image, result }) {
  return (
    <Card className="my-8 bg-[var(--glass-bg)] border-[var(--glass-border)] overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {image && (
            <img src={image} alt={author} className="w-14 h-14 rounded-full object-cover" />
          )}
          <div className="flex-1">
            <blockquote className="text-lg text-[var(--text-primary)] italic mb-3">
              "{quote}"
            </blockquote>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-[var(--text-primary)]">{author}</div>
                <div className="text-sm text-[var(--text-secondary)]">{company}</div>
              </div>
              {result && (
                <Badge className="bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-0">
                  {result}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Comparison Table Component
 * Before/After or Feature comparison
 */
export function ComparisonTable({ title, beforeLabel, afterLabel, columns, items = [], rows, children }) {
  const colLabels = columns
    ? { before: columns[0], after: columns[1] }
    : { before: beforeLabel || 'Without Us', after: afterLabel || 'With Us' }

  let resolvedItems
  if (rows && rows.length > 0) {
    resolvedItems = rows.map(r => ({
      feature: r.label,
      before: r.cells?.[0],
      after: r.cells?.[1],
    }))
  } else if (items.length > 0) {
    resolvedItems = items
  } else {
    resolvedItems = React.Children.toArray(children)
      .filter(child => child?.props)
      .map(child => ({
        feature: child.props.feature,
        before: child.props.before,
        after: child.props.after,
      }))
  }

  return (
    <div className="my-10">
      {title && (
        <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] text-center mb-8">{title}</h2>
      )}
      <div className="relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.2)] rounded-3xl">
        {/* Header row */}
        <div className="grid grid-cols-3">
          <div className="p-5 font-medium text-sm uppercase tracking-widest text-[var(--text-tertiary)]">Feature</div>
          <div className="p-5 font-medium text-center border-l border-white/10">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-sm font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              {colLabels.before}
            </span>
          </div>
          <div className="p-5 font-medium text-center border-l border-white/10">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#39bfb0]/10 text-[#39bfb0] text-sm font-semibold">
              <CheckCircle className="w-3.5 h-3.5" />
              {colLabels.after}
            </span>
          </div>
        </div>
        {/* Data rows */}
        {resolvedItems.map((item, i) => (
          <div key={i} className="grid grid-cols-3 border-t border-white/10 group hover:bg-white/5 transition-colors">
            <div className="p-5 text-[var(--text-primary)] font-medium">{item.feature}</div>
            <div className="p-5 text-center border-l border-white/10 text-[var(--text-secondary)] text-sm">
              {item.before}
            </div>
            <div className="p-5 text-center border-l border-white/10 text-[#39bfb0] font-semibold text-sm">
              {item.after}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ComparisonRow() { return null }

/**
 * Process Steps Component
 * Visual numbered process
 */
export function ProcessSteps({ title, steps = [] }) {
  return (
    <div className="my-10">
      {title && (
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-8">{title}</h3>
      )}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-[var(--brand-primary)] to-[var(--brand-primary)]/20" />
        
        <div className="space-y-6">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-4 relative">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--brand-primary)] text-white flex items-center justify-center font-bold text-lg z-10">
                {i + 1}
              </div>
              <div className="flex-1 pt-2">
                <h4 className="font-semibold text-[var(--text-primary)] mb-1">{step.title}</h4>
                <p className="text-[var(--text-secondary)] text-sm">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Metric Highlight Component
 * Big bold metric display
 */
export function MetricHighlight({ value, label, trend, icon: Icon = TrendingUp }) {
  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)]/5 to-transparent border border-[var(--glass-border)] text-center">
      <Icon className="w-8 h-8 text-[var(--brand-primary)] mx-auto mb-3" />
      <div className="text-4xl font-bold text-[var(--text-primary)] mb-1">{value}</div>
      <div className="text-sm text-[var(--text-secondary)]">{label}</div>
      {trend && (
        <div className="mt-2 text-sm text-[var(--brand-primary)] font-medium">{trend}</div>
      )}
    </div>
  )
}
MetricHighlight.displayName = 'MetricHighlight'

/**
 * CTA Section Component
 * Strong call-to-action block (button removed - signature block follows directly)
 */
export function CTASection({ title, subtitle, urgencyText }) {
  return (
    <div className="my-12 p-8 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 text-white text-center">
      <h3 className="text-2xl sm:text-3xl font-bold mb-3">{title}</h3>
      {subtitle && (
        <p className="text-lg opacity-80 mb-6 max-w-2xl mx-auto">{subtitle}</p>
      )}
      {urgencyText && (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">{urgencyText}</span>
        </div>
      )}
    </div>
  )
}

/**
 * Icon Feature Grid Component
 * Feature list with icons
 */
export function IconFeatureGrid({ features = [] }) {
  const iconMap = {
    globe: Globe,
    smartphone: Smartphone,
    search: Search,
    mail: Mail,
    calendar: Calendar,
    zap: Zap,
    award: Award,
    target: Target,
    chart: BarChart3,
    users: Users,
    trending: TrendingUp
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-8">
      {features.map((feature, i) => {
        const Icon = iconMap[feature.icon] || CheckCircle
        return (
          <div key={i} className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
            <Icon className="w-6 h-6 text-[var(--brand-primary)] mb-3" />
            <h4 className="font-semibold text-[var(--text-primary)] mb-1">{feature.title}</h4>
            <p className="text-sm text-[var(--text-secondary)]">{feature.description}</p>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Bonus Section Component
 * Highlight bonus/add-on offers
 */
export function BonusSection({ title = 'Special Bonus', items = [], expiresText }) {
  return (
    <div className="my-10 p-6 rounded-2xl border-2 border-dashed border-[var(--accent-orange)] bg-[var(--accent-orange)]/5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-6 h-6 text-[var(--accent-orange)]" />
        <h3 className="text-xl font-bold text-[var(--text-primary)]">{title}</h3>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-[var(--accent-orange)] mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-[var(--text-primary)]">{item.title}</span>
              {item.value && (
                <span className="text-[var(--text-secondary)]"> (${item.value} value)</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {expiresText && (
        <div className="mt-4 pt-4 border-t border-[var(--accent-orange)]/30">
          <span className="text-sm text-[var(--accent-orange)] font-medium">{expiresText}</span>
        </div>
      )}
    </div>
  )
}

/**
 * Website Portfolio Component
 * Displays multiple websites included in a proposal with breakdown
 * 
 * @param {string} title - Section title (default: "Websites Included")
 * @param {string} subtitle - Optional subtitle/description
 * @param {Array} websites - Array of website objects with:
 *   - name: Display name (e.g., "Main Corporate Site")
 *   - url: Website URL
 *   - status: Current status badge (e.g., "Rebuild", "Migration", "Optimization")
 *   - platform: Current platform (e.g., "Wix", "WordPress", "Custom")
 *   - issues: Array of current issues/problems
 *   - scope: Array of what will be done for this site
 * @param {boolean} showTotals - Show summary totals at bottom
 */
export function WebsitePortfolio({ 
  title = "Websites Included", 
  subtitle,
  websites = [],
  showTotals = true 
}) {
  const statusColors = {
    rebuild: 'bg-[var(--accent-red)]/10 text-[var(--accent-red)] border-[var(--accent-red)]/30',
    migration: 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] border-[var(--accent-orange)]/30',
    optimization: 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-[var(--accent-blue)]/30',
    maintenance: 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/30',
    new: 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-[var(--accent-green)]/30'
  }

  const getStatusColor = (status) => {
    const key = status?.toLowerCase().replace(/\s+/g, '')
    return statusColors[key] || statusColors.optimization
  }

  // Count websites by status
  const statusCounts = websites.reduce((acc, site) => {
    const status = site.status?.toLowerCase() || 'other'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="my-10">
      <div className="flex items-center gap-3 mb-2">
        <Layers className="w-6 h-6 text-[var(--brand-primary)]" />
        <h3 className="text-xl font-bold text-[var(--text-primary)]">{title}</h3>
        <Badge className="bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-0">
          {websites.length} {websites.length === 1 ? 'site' : 'sites'}
        </Badge>
      </div>
      
      {subtitle && (
        <p className="text-[var(--text-secondary)] mb-6 ml-9">{subtitle}</p>
      )}

      <div className="space-y-4">
        {websites.map((site, i) => (
          <div 
            key={i}
            className="p-5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--brand-primary)]/30 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-[var(--text-primary)]">{site.name}</h4>
                  {site.status && (
                    <Badge className={`text-xs border ${getStatusColor(site.status)}`}>
                      {site.status}
                    </Badge>
                  )}
                  {site.platform && (
                    <span className="text-xs text-[var(--text-tertiary)] bg-[var(--glass-bg)] px-2 py-0.5 rounded">
                      {site.platform}
                    </span>
                  )}
                </div>
                {site.url && (
                  <a 
                    href={site.url.startsWith('http') ? site.url : `https://${site.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    {site.url.replace(/^https?:\/\//, '')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Issues */}
            {site.issues && site.issues.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
                  Current Issues
                </div>
                <div className="flex flex-wrap gap-2">
                  {site.issues.map((issue, j) => (
                    <span 
                      key={j}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-[var(--accent-red)]/10 text-[var(--accent-red)]"
                    >
                      <AlertCircle className="w-3 h-3" />
                      {issue}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Scope */}
            {site.scope && site.scope.length > 0 && (
              <div>
                <div className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
                  What We'll Do
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {site.scope.map((item, j) => (
                    <div key={j} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <CheckCircle className="w-3.5 h-3.5 text-[var(--brand-primary)] flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary totals */}
      {showTotals && Object.keys(statusCounts).length > 1 && (
        <div className="mt-6 p-4 rounded-xl bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20">
          <div className="flex flex-wrap gap-4 justify-center">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="text-center">
                <div className="text-2xl font-bold text-[var(--text-primary)]">{count}</div>
                <div className="text-xs text-[var(--text-secondary)] capitalize">{status}</div>
              </div>
            ))}
            <div className="text-center border-l border-[var(--glass-border)] pl-4">
              <div className="text-2xl font-bold text-[var(--brand-primary)]">{websites.length}</div>
              <div className="text-xs text-[var(--text-secondary)]">Total Sites</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
WebsitePortfolio.displayName = 'WebsitePortfolio'

export default {
  ValueStack,
  GuaranteeBadge,
  UrgencyBanner,
  Testimonial,
  ComparisonTable,
  ComparisonRow,
  ProcessSteps,
  MetricHighlight,
  CTASection,
  IconFeatureGrid,
  BonusSection,
  WebsitePortfolio
}
