import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  CheckCircle,
  XCircle,
  ArrowRight,
  BarChart3,
  Target,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { portalApi } from '@/lib/sonor-api'
import SignalIcon from '@/components/ui/SignalIcon'

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'primary' }) {
  const colorStyles = {
    primary: 'var(--brand-primary)',
    red: 'rgb(239, 68, 68)',
    amber: 'rgb(245, 158, 11)',
    emerald: 'rgb(16, 185, 129)',
    violet: 'rgb(139, 92, 246)'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: `color-mix(in srgb, ${colorStyles[color]} 15%, transparent)` }}
            >
              <Icon className="h-6 w-6" style={{ color: colorStyles[color] }} />
            </div>
          </div>
          {trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 mt-3 text-xs",
              trend >= 0 ? "text-emerald-600" : "text-red-600"
            )}>
              <TrendingUp className={cn("h-3 w-3", trend < 0 && "rotate-180")} />
              <span>{Math.abs(trend)}% from last week</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// TEAM MEMBER ROW
// ============================================================================

function TeamMemberRow({ member, onViewTasks }) {
  const completionRate = member.total_tasks > 0 
    ? Math.round((member.completed_tasks / member.total_tasks) * 100) 
    : 0

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center text-sm font-medium">
        {member.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{member.name || member.email}</span>
          {member.overdue_tasks > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5">
              {member.overdue_tasks} overdue
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={completionRate} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground w-12 text-right">
            {completionRate}%
          </span>
        </div>
      </div>

      <div className="text-right text-sm">
        <div className="font-medium">{member.active_tasks || 0}</div>
        <div className="text-xs text-muted-foreground">active</div>
      </div>

      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => onViewTasks?.(member)}
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

// ============================================================================
// BOTTLENECK ITEM
// ============================================================================

function BottleneckItem({ item, type }) {
  const getIcon = () => {
    switch (type) {
      case 'blocked': return XCircle
      case 'overdue': return AlertTriangle
      case 'pending_approval': return Clock
      default: return AlertTriangle
    }
  }

  const getColor = () => {
    switch (type) {
      case 'blocked': return 'red'
      case 'overdue': return 'amber'
      case 'pending_approval': return 'violet'
      default: return 'gray'
    }
  }

  const Icon = getIcon()
  const color = getColor()

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className={cn(
        "p-2 rounded-lg",
        color === 'red' && "bg-red-100 dark:bg-red-500/20",
        color === 'amber' && "bg-amber-100 dark:bg-amber-500/20",
        color === 'violet' && "bg-violet-100 dark:bg-violet-500/20"
      )}>
        <Icon className={cn(
          "h-4 w-4",
          color === 'red' && "text-red-600",
          color === 'amber' && "text-amber-600",
          color === 'violet' && "text-violet-600"
        )} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground">
          {item.assignee_name || 'Unassigned'} • {item.days_overdue ? `${item.days_overdue}d overdue` : item.status}
        </p>
      </div>

      {item.priority === 'urgent' && (
        <Badge variant="destructive" className="text-[10px] h-5">Urgent</Badge>
      )}
    </div>
  )
}

// ============================================================================
// MAIN ADMIN OVERVIEW PANEL
// ============================================================================

export default function AdminOverviewPanel({ orgId, projectId }) {
  const [stats, setStats] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [bottlenecks, setBottlenecks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOverviewData()
  }, [orgId, projectId])

  const loadOverviewData = async () => {
    try {
      setLoading(true)
      
      // Fetch team capacity (already exists)
      const capacityRes = await portalApi.sync.getTeamCapacity(projectId)
      
      // Calculate stats from team data
      const teamData = capacityRes.data?.team_members || []
      
      const totalTasks = teamData.reduce((sum, m) => sum + (m.total_tasks || 0), 0)
      const completedTasks = teamData.reduce((sum, m) => sum + (m.completed_tasks || 0), 0)
      const overdueTasks = teamData.reduce((sum, m) => sum + (m.overdue_tasks || 0), 0)
      const activeTasks = teamData.reduce((sum, m) => sum + (m.active_tasks || 0), 0)
      
      setStats({
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        completion_rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        overdue_tasks: overdueTasks,
        active_tasks: activeTasks,
        pending_approvals: capacityRes.data?.pending_actions || 0,
        team_size: teamData.length
      })
      
      setTeamMembers(teamData)

      // Build bottlenecks list from team data
      const issues = []
      teamData.forEach(member => {
        if (member.overdue_tasks > 0) {
          issues.push({
            type: 'overdue',
            title: `${member.overdue_tasks} overdue task${member.overdue_tasks > 1 ? 's' : ''}`,
            assignee_name: member.name || member.email,
            priority: member.overdue_tasks > 3 ? 'urgent' : 'high',
            days_overdue: null,
            status: `${member.overdue_tasks} tasks`
          })
        }
      })
      
      setBottlenecks(issues)
    } catch (err) {
      console.error('Failed to load admin overview:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleViewMemberTasks = (member) => {
    // Could navigate to filtered view or open modal
    console.log('View tasks for:', member)
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p>Loading overview...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Tasks"
          value={stats?.active_tasks || 0}
          subtitle={`${stats?.team_size || 0} team members`}
          icon={Target}
          color="primary"
        />
        <StatCard
          title="Completion Rate"
          value={`${stats?.completion_rate || 0}%`}
          subtitle={`${stats?.completed_tasks || 0} of ${stats?.total_tasks || 0}`}
          icon={CheckCircle}
          color="emerald"
        />
        <StatCard
          title="Overdue"
          value={stats?.overdue_tasks || 0}
          subtitle="Need attention"
          icon={AlertTriangle}
          color={stats?.overdue_tasks > 0 ? 'red' : 'emerald'}
        />
        <StatCard
          title="Pending Approvals"
          value={stats?.pending_approvals || 0}
          subtitle="Signal actions"
          icon={SignalIcon}
          color="violet"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Team Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {teamMembers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No team members found
                  </p>
                ) : (
                  teamMembers.map((member, idx) => (
                    <TeamMemberRow 
                      key={member.email || idx} 
                      member={member}
                      onViewTasks={handleViewMemberTasks}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Bottlenecks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Attention Needed
              {bottlenecks.length > 0 && (
                <Badge variant="outline" className="ml-auto">
                  {bottlenecks.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {bottlenecks.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                    <p className="font-medium">All clear!</p>
                    <p className="text-sm text-muted-foreground">No bottlenecks detected</p>
                  </div>
                ) : (
                  bottlenecks.map((item, idx) => (
                    <BottleneckItem key={idx} item={item} type={item.type} />
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Reassign Tasks
            </Button>
            <Button variant="outline" size="sm">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Clear Overdue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
