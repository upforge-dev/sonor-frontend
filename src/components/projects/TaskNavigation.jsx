/**
 * TaskNavigation - Left sidebar for task views
 * 
 * Shows different navigation based on user role:
 * - Sonor Admin: Task views, filters, module breakdown, quick stats
 * - Org-Level/Standard: Personal task views, categories
 */
import { useMemo } from 'react'
import { 
  ListTodo, Calendar, CalendarDays, AlertTriangle, CheckCircle2,
  Circle, CircleDot, CircleDotDashed, Ban, Plus,
  Search, Radio, Star, ShoppingCart, BookOpen, Users, Mail, Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { UPTRADE_TASK_STATUS_CONFIG, UPTRADE_TASK_MODULE_CONFIG } from '@/lib/hooks'

// Module icon mapping (matches Sidebar.jsx icons)
const MODULE_ICONS = {
  seo: Search,
  broadcast: Radio,
  reputation: Star,
  engage: Zap,
  commerce: ShoppingCart,
  blog: BookOpen,
  prospects: Users,
  outreach: Mail,
  general: ListTodo,
}

// Status icon mapping
const STATUS_ICONS = {
  not_started: Circle,
  in_progress: CircleDotDashed,
  in_review: CircleDot,
  blocked: Ban,
  completed: CheckCircle2,
}

export function UptradeTaskNavigation({ 
  stats,
  activeView,
  activeStatus,
  activeModule,
  onViewChange,
  onStatusChange,
  onModuleChange,
  enabledModules, // Array of enabled module keys from project features
}) {
  // Filter modules to only show those enabled for the selected project
  const filteredModules = useMemo(() => {
    if (!enabledModules || enabledModules.length === 0) {
      // If no project selected or no modules enabled, show all
      return Object.entries(UPTRADE_TASK_MODULE_CONFIG)
    }
    return Object.entries(UPTRADE_TASK_MODULE_CONFIG).filter(([key]) => {
      // Always show 'general' and 'prospects'
      if (key === 'general' || key === 'prospects') return true
      // Show if module is in enabledModules array
      return enabledModules.includes(key)
    })
  }, [enabledModules])

  return (
    <div className="flex flex-col h-full py-4">
      {/* Task Views */}
      <div className="px-3 mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Task Views
        </h3>
        <nav className="space-y-1">
          <NavItem 
            icon={ListTodo}
            label="All Tasks"
            count={stats?.total || 0}
            active={activeView === 'all'}
            onClick={() => onViewChange('all')}
          />
          <NavItem 
            icon={Calendar}
            label="Today"
            count={stats?.dueToday || 0}
            active={activeView === 'today'}
            onClick={() => onViewChange('today')}
          />
          <NavItem 
            icon={CalendarDays}
            label="This Week"
            count={stats?.dueThisWeek || 0}
            active={activeView === 'week'}
            onClick={() => onViewChange('week')}
          />
          <NavItem 
            icon={AlertTriangle}
            label="Overdue"
            count={stats?.overdue || 0}
            active={activeView === 'overdue'}
            onClick={() => onViewChange('overdue')}
            variant={stats?.overdue > 0 ? 'warning' : 'default'}
          />
          <NavItem 
            icon={CheckCircle2}
            label="Completed"
            count={stats?.completed || 0}
            active={activeView === 'completed'}
            onClick={() => onViewChange('completed')}
          />
        </nav>
      </div>

      <Separator className="my-2" />

      {/* By Status */}
      <div className="px-3 mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          By Status
        </h3>
        <nav className="space-y-1">
          {Object.entries(UPTRADE_TASK_STATUS_CONFIG).filter(([key]) => key !== 'completed').map(([key, config]) => {
            const Icon = STATUS_ICONS[key]
            return (
              <NavItem
                key={key}
                icon={Icon}
                label={config.label}
                count={stats?.[key] || 0}
                active={activeStatus === key}
                onClick={() => onStatusChange(key)}
              />
            )
          })}
        </nav>
      </div>

      <Separator className="my-2" />

      {/* By Module */}
      <div className="px-3 mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          By Module
        </h3>
        <nav className="space-y-1">
          {filteredModules.map(([key, config]) => {
            const Icon = MODULE_ICONS[key]
            return (
              <NavItem
                key={key}
                icon={Icon}
                label={config.label}
                count={stats?.byModule?.[key] || 0}
                active={activeModule === key}
                onClick={() => onModuleChange(key)}
              />
            )
          })}
        </nav>
      </div>

      <Separator className="my-2" />

      {/* Quick Stats */}
      <div className="px-3 mt-auto">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Quick Stats
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Due Today</span>
            <span className="font-medium">{stats?.dueToday || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Overdue</span>
            <span className={cn("font-medium", stats?.overdue > 0 && "text-red-600")}>
              {stats?.overdue || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Completed This Week</span>
            <span className="font-medium text-emerald-600">{stats?.completedThisWeek || 0}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function UserTaskNavigation({
  stats,
  categories,
  activeView,
  activeCategory,
  onViewChange,
  onCategoryChange,
  onAddCategory,
}) {
  return (
    <div className="flex flex-col h-full py-4">
      {/* My Tasks */}
      <div className="px-3 mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          My Tasks
        </h3>
        <nav className="space-y-1">
          <NavItem 
            icon={ListTodo}
            label="All Tasks"
            count={stats?.total || 0}
            active={activeView === 'all'}
            onClick={() => onViewChange('all')}
          />
          <NavItem 
            icon={Calendar}
            label="Today"
            count={stats?.dueToday || 0}
            active={activeView === 'today'}
            onClick={() => onViewChange('today')}
          />
          <NavItem 
            icon={CalendarDays}
            label="This Week"
            count={stats?.dueThisWeek || 0}
            active={activeView === 'week'}
            onClick={() => onViewChange('week')}
          />
          <NavItem 
            icon={CheckCircle2}
            label="Completed"
            count={stats?.completed || 0}
            active={activeView === 'completed'}
            onClick={() => onViewChange('completed')}
          />
        </nav>
      </div>

      <Separator className="my-2" />

      {/* Categories */}
      <div className="px-3 flex-1">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Categories
        </h3>
        <nav className="space-y-1">
          {categories.map((category) => (
            <NavItem
              key={category.id}
              label={category.name}
              count={category.task_count || 0}
              active={activeCategory === category.id}
              onClick={() => onCategoryChange(category.id)}
              color={category.color}
            />
          ))}
          
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={onAddCategory}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </nav>
      </div>
    </div>
  )
}

// Shared navigation item component
function NavItem({ 
  icon: Icon, 
  label, 
  count, 
  active, 
  onClick, 
  variant = 'default',
  color,
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors",
        active 
          ? "bg-primary/10 text-primary font-medium" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" />}
        {color && !Icon && (
          <div 
            className="h-3 w-3 rounded-full" 
            style={{ backgroundColor: color }}
          />
        )}
        <span>{label}</span>
      </div>
      {count !== undefined && (
        <Badge 
          variant="secondary" 
          className={cn(
            "h-5 min-w-5 px-1.5",
            variant === 'warning' && "bg-orange-100 text-orange-700",
            active && "bg-primary/20 text-primary"
          )}
        >
          {count}
        </Badge>
      )}
    </button>
  )
}

export default { UptradeTaskNavigation, UserTaskNavigation }
