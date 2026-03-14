import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock } from 'lucide-react'
import Section from './Section'

/**
 * Timeline Block
 * Theme-compatible: Uses CSS custom properties
 */
export function Timeline({ children, phases, title = 'Project Timeline' }) {
  return (
    <Section bg="transparent">
      <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-6 sm:mb-8">
        {title}
      </h2>
      <div className="space-y-6">
        {phases
          ? phases.map((phase, i) => (
              <Phase key={i} number={phase.number ?? i + 1} {...phase} />
            ))
          : children}
      </div>
    </Section>
  )
}

export function Phase({ 
  number, 
  title, 
  duration, 
  deliverables = [],
  description 
}) {
  return (
    <div className="relative pl-8 pb-8 border-l-2 border-[var(--glass-border-strong)] last:border-transparent">
      <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-[var(--brand-primary)] border-4 border-[var(--surface-page)] flex items-center justify-center">
        <span className="text-xs font-bold text-white">{number}</span>
      </div>
      <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg p-6 shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-[var(--text-primary)]">{title}</h3>
          <Badge variant="outline" className="flex items-center border-[var(--glass-border-strong)] text-[var(--text-secondary)]">
            <Clock className="h-3 w-3 mr-1" />
            {duration}
          </Badge>
        </div>
        {description && <p className="text-[var(--text-secondary)] mb-4">{description}</p>}
        {deliverables.length > 0 && (
          <ul className="space-y-2">
            {deliverables.map((item, i) => (
              <li key={i} className="flex items-start text-sm">
                <CheckCircle className="h-4 w-4 text-[var(--brand-primary)] mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-[var(--text-secondary)]">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default Timeline
