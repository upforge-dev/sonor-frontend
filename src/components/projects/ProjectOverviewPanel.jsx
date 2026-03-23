/**
 * ProjectOverviewPanel - Project overview dashboard tab
 * 
 * Shows key metrics, recent activity, quick actions
 * Different views for admin vs client users
 */
import { useMemo } from 'react'
import { 
  ExternalLink, Calendar, CheckCircle2, Clock, AlertCircle, 
  Users, BarChart3, Palette, Link2, Settings2, TrendingUp,
  ArrowRight, Globe, Phone, Mail, MapPin, Search, LineChart,
  Target, MessageSquare, Radio, Star, Zap, ShoppingCart, BookOpen, ListTodo
} from 'lucide-react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

// UI Components
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/EmptyState'

// Hooks
import {
  useUptradeTasksStats,
  useDeliverables,
  useDeliverablesPendingApprovals,
  UPTRADE_TASK_MODULE_CONFIG,
} from '@/lib/hooks'

// Module icon mapping (matches Sidebar.jsx)
const MODULE_ICONS = {
  Search, Radio, Star, Zap, ShoppingCart, BookOpen, Users, Mail, ListTodo,
}

// Stat card component
function StatCard({ title, value, description, icon: Icon, trend, variant = 'default' }) {
  const variants = {
    default: 'bg-[var(--glass-bg)]',
    primary: 'bg-primary/5 border-primary/20',
    success: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
    warning: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
    danger: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
  }

  return (
    <Card className={cn("transition-colors", variants[variant])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {Icon && (
            <div className={cn(
              "p-2 rounded-lg",
              variant === 'default' ? 'bg-muted' : 'bg-white/50 dark:bg-white/10'
            )}>
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 mt-2 text-xs",
            trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-muted-foreground'
          )}>
            <TrendingUp className={cn(
              "h-3 w-3",
              trend < 0 && "rotate-180"
            )} />
            <span>{trend === 0 ? 'No change' : `${Math.abs(trend)}% from last week`}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Module progress card
function ModuleCard({ moduleKey, config, stats, onClick }) {
  const completed = stats?.completed || 0
  const total = stats?.total || 0
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
  const Icon = MODULE_ICONS[config?.iconName] || ListTodo

  return (
    <Card 
      className="group hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div 
            className="p-2.5 rounded-xl"
            style={{ 
              backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
            }}
          >
            <Icon 
              className="h-5 w-5" 
              style={{ color: 'var(--brand-primary)' }}
            />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm">{config?.label || moduleKey}</h4>
            <p className="text-xs text-muted-foreground">
              {total > 0 ? `${completed}/${total} tasks` : 'No tasks'}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {total > 0 && <Progress value={percentage} className="h-1.5" />}
      </CardContent>
    </Card>
  )
}

// Quick action button
function QuickAction({ icon: Icon, label, onClick, variant = 'outline' }) {
  return (
    <Button 
      variant={variant} 
      size="sm" 
      className="justify-start gap-2 h-10"
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  )
}

// Activity feed item
function ActivityItem({ activity }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={activity.user?.avatar_url} />
        <AvatarFallback className="text-xs">
          {activity.user?.full_name?.slice(0, 2)?.toUpperCase() || '??'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{activity.user?.full_name}</span>
          {' '}
          <span className="text-muted-foreground">{activity.action}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}

// Deliverable preview card
function DeliverableCard({ deliverable, onView }) {
  return (
    <Card 
      className="group cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onView?.(deliverable)}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Thumbnail */}
          {deliverable.file_url ? (
            <img 
              src={deliverable.file_url} 
              alt={deliverable.title}
              className="h-12 w-12 rounded-lg object-cover bg-muted"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
              <Palette className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{deliverable.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {deliverable.deliverable_type}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Connection status component
function ConnectionStatus({ connections = [], onManage }) {
  const connected = connections.filter(c => c.status === 'active')
  const pending = connections.filter(c => c.status === 'pending')

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Connections
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {connected.length === 0 && pending.length === 0 ? (
          <EmptyState.Card
            icon={Link2}
            title="No connections set up yet"
            description="Connect platforms to sync data and tasks."
            actionLabel="Manage Connections"
            onAction={onManage}
          />
        ) : (
          <>
            {connected.map(conn => (
              <div key={conn.id} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{conn.platform}</span>
              </div>
            ))}
            {pending.map(conn => (
              <div key={conn.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{conn.platform} (pending)</span>
              </div>
            ))}
          </>
        )}
        {!(connected.length === 0 && pending.length === 0) && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-2"
            onClick={onManage}
          >
            Manage Connections
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function ProjectOverviewPanel({ 
  project, 
  isAdmin = false,
  onNavigateToTasks,
  onNavigateToCreative,
  onNavigateToConnections,
  onViewDeliverable,
}) {
  const { data: taskStats } = useUptradeTasksStats(project?.id, { enabled: !!project?.id })
  const { data: deliverables = [] } = useDeliverables(project?.id, {}, { enabled: !!project?.id })
  const { data: pendingApprovals = [] } = useDeliverablesPendingApprovals(project?.id, { enabled: !!project?.id })

  // Calculate module stats from task stats
  const moduleStats = useMemo(() => {
    // In real implementation, this would come from the API
    // For now, provide placeholder structure
    return {
      seo: { completed: taskStats?.completed || 0, total: taskStats?.total || 0 },
      analytics: { completed: 0, total: 0 },
      engage: { completed: 0, total: 0 },
      crm: { completed: 0, total: 0 },
    }
  }, [taskStats])

  // Recent deliverables
  const recentDeliverables = useMemo(() => {
    return [...(deliverables || [])]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 4)
  }, [deliverables])

  // Recent activity - would come from API (currently empty until connected)
  const recentActivity = useMemo(() => [], [])

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Select a project to view details
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Project Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{project.title || project.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {project.domain && (
                <a 
                  href={`https://${project.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  {project.domain}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {project.created_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Since {format(parseISO(project.created_at), 'MMM yyyy')}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {project.domain && (
              <Button variant="outline" size="sm" asChild>
                <a href={`https://${project.domain}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Visit Site
                </a>
              </Button>
            )}
            {isAdmin && (
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-1" />
                Settings
              </Button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Active Tasks"
            value={taskStats?.in_progress || 0}
            description={`${taskStats?.total || 0} total tasks`}
            icon={Clock}
            variant={(taskStats?.in_progress || 0) > 0 ? 'primary' : 'default'}
          />
          <StatCard
            title="Completed"
            value={taskStats?.completed || 0}
            description="All time"
            icon={CheckCircle2}
            variant="success"
          />
          <StatCard
            title="Pending Review"
            value={pendingApprovals?.length || 0}
            description="Awaiting approval"
            icon={Palette}
            variant={(pendingApprovals?.length || 0) > 0 ? 'warning' : 'default'}
          />
          <StatCard
            title="Overdue"
            value={taskStats?.overdue || 0}
            description="Need attention"
            icon={AlertCircle}
            variant={(taskStats?.overdue || 0) > 0 ? 'danger' : 'default'}
          />
        </div>

        {/* Module Progress - Full Width Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Module Progress</CardTitle>
            <CardDescription>Track progress across all project modules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Object.entries(UPTRADE_TASK_MODULE_CONFIG).filter(([key]) => key !== 'general').map(([key, config]) => (
                <ModuleCard 
                  key={key} 
                  moduleKey={key}
                  config={config}
                  stats={moduleStats[key]}
                  onClick={() => onNavigateToTasks?.(key)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions (Admin Only) - Full Width */}
        {isAdmin && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <QuickAction 
              icon={CheckCircle2} 
              label="Add Task" 
              onClick={onNavigateToTasks}
            />
            <QuickAction 
              icon={Palette} 
              label="Upload Asset" 
              onClick={onNavigateToCreative}
            />
            <QuickAction 
              icon={BarChart3} 
              label="View Analytics" 
            />
            <QuickAction 
              icon={Link2} 
              label="Connections" 
              onClick={onNavigateToConnections}
            />
          </div>
        )}

        {/* Bottom Row - Connections, Activity, Project Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Connection Status */}
          <ConnectionStatus 
            connections={project.connections || []} 
            onManage={onNavigateToConnections}
          />

          {/* Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="divide-y">
                  {recentActivity.map(activity => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </CardContent>
          </Card>

          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {project.org_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Organization:</span>
                  <span className="font-medium">{project.org_name}</span>
                </div>
              )}
              
              {project.contact_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`mailto:${project.contact_email}`}
                    className="text-primary hover:underline"
                  >
                    {project.contact_email}
                  </a>
                </div>
              )}

              {project.contact_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{project.contact_phone}</span>
                </div>
              )}

              {project.timezone && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{project.timezone}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Deliverables - Full Width */}
        {recentDeliverables.length > 0 && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Deliverables</CardTitle>
                <CardDescription>Latest creative assets</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={onNavigateToCreative}>
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {recentDeliverables.map(d => (
                  <DeliverableCard 
                    key={d.id} 
                    deliverable={d} 
                    onView={onViewDeliverable}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  )
}
