import { AlertTriangle } from 'lucide-react'
import Section from './Section'

/**
 * Critical Issues Block
 * Theme-compatible: Dark bg works in both themes
 */
export function CriticalIssues({ children, issues, title = 'CRITICAL DIGITAL GAPS' }) {
  return (
    <Section bg="transparent">
      <div className="bg-gray-900 dark:bg-black rounded-xl p-4 sm:p-8 border-l-4 border-[var(--accent-orange)]">
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center">
          <div className="flex items-center mb-2 sm:mb-0">
            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 text-[var(--accent-orange)]" />
            <span className="text-[var(--accent-orange)]">{title}</span>
          </div>
        </h3>
        <div className="space-y-4">
          {issues
            ? issues.map((issue, i) => (
                <IssueCard key={i} title={issue.title} description={issue.description} severity={issue.severity} />
              ))
            : children}
        </div>
      </div>
    </Section>
  )
}

export function IssueCard({ title, description, severity = 'high' }) {
  const severityColors = {
    critical: 'bg-[var(--accent-red)]/20 border-[var(--accent-red)]',
    high: 'bg-[var(--accent-orange)]/20 border-[var(--accent-orange)]',
    medium: 'bg-[var(--accent-yellow)]/20 border-[var(--accent-yellow)]'
  }
  
  return (
    <div className={`p-4 border-l-4 rounded ${severityColors[severity]}`}>
      <h4 className="font-semibold text-white mb-2">{title}</h4>
      <p className="text-gray-300 text-sm">{description}</p>
    </div>
  )
}

export default CriticalIssues
