import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  FolderOpen, 
  MessageSquare, 
  DollarSign, 
  BarChart3,
  ArrowRight,
  Lightbulb
} from 'lucide-react'

/**
 * DashboardEmptyState - Branded empty state with contextual guidance
 * Usage:
 *   <DashboardEmptyState
 *     type="projects"
 *     title="No projects yet"
 *     description="Start by viewing pending proposals"
 *     actionLabel="View Proposals"
 *     onAction={() => navigate('/proposals')}
 *   />
 */

export function DashboardEmptyState({ 
  type = 'default',
  title, 
  description, 
  actionLabel,
  onAction,
  icon: Icon,
  suggestions = []
}) {
  const defaultIcons = {
    projects: FolderOpen,
    messages: MessageSquare,
    invoices: DollarSign,
    reports: BarChart3,
    default: FolderOpen
  }

  const IconComponent = Icon || defaultIcons[type] || defaultIcons.default

  return (
    <Card className="border-2 border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 p-3 rounded-full bg-[var(--surface-tertiary)]">
          <IconComponent className="w-6 h-6 text-[var(--text-secondary)]" />
        </div>
        
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm">{description}</p>

        {actionLabel && (
          <Button 
            onClick={onAction}
            variant="glass-primary"
            className="mb-6"
          >
            {actionLabel}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {suggestions.length > 0 && (
          <div className="border-t border-[var(--glass-border)] pt-6 w-full">
            <div className="flex items-center justify-center text-sm text-[var(--text-secondary)] mb-3">
              <Lightbulb className="w-4 h-4 mr-2" />
              <span className="font-medium">Suggestions:</span>
            </div>
            <ul className="text-sm text-[var(--text-secondary)] space-y-1">
              {suggestions.map((suggestion, i) => (
                <li key={i}>• {suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ProjectsEmptyState({ onAction }) {
  return (
    <DashboardEmptyState
      type="projects"
      title="No active projects"
      description="Projects are created when you accept a proposal. View pending proposals to get started."
      actionLabel="View Proposals"
      onAction={onAction}
      suggestions={[
        'Check your email for new proposals',
        'You can accept or decline proposals anytime',
        'Accepted proposals will appear here as projects'
      ]}
    />
  )
}

export function MessagesEmptyState({ onAction }) {
  return (
    <DashboardEmptyState
      type="messages"
      title="No messages yet"
      description="Message threads from your Sonor team will appear here. Check back soon!"
      actionLabel="View All Messages"
      onAction={onAction}
      suggestions={[
        'Important project updates will be posted here',
        'You can reply to messages directly',
        'Turn on notifications to stay updated'
      ]}
    />
  )
}

export function InvoicesEmptyState({ onAction }) {
  return (
    <DashboardEmptyState
      type="invoices"
      title="No invoices yet"
      description="Invoices will be generated as work progresses on your projects."
      actionLabel="View All Invoices"
      onAction={onAction}
      suggestions={[
        'Invoices are sent when project milestones are reached',
        'You can download and print any invoice',
        'Payment links are included in each invoice'
      ]}
    />
  )
}

export function AuditsEmptyState({ onAction }) {
  return (
    <DashboardEmptyState
      type="reports"
      title="No audits yet"
      description="Performance audits will show detailed website metrics, accessibility scores, and SEO recommendations."
      actionLabel="Request Your First Audit"
      onAction={onAction}
      suggestions={[
        'Audits analyze performance, accessibility, and SEO',
        'Results include detailed improvement recommendations',
        'Audits are updated regularly as work progresses'
      ]}
    />
  )
}

export function ReportsEmptyState({ onAction }) {
  return (
    <DashboardEmptyState
      type="reports"
      title="Analytics coming soon"
      description="Detailed reports about your projects, revenue, and performance will appear here."
      actionLabel="View Dashboard"
      onAction={onAction}
      suggestions={[
        'Check back as your projects progress',
        'Reports update automatically',
        'Filter by date range and project'
      ]}
    />
  )
}

export default DashboardEmptyState
