/**
 * MetricsGrid - Key metric cards with trends (Analytics module)
 *
 * Now delegates to the unified StatTile component.
 */
import { StatTileGrid } from '@/components/ui/stat-tile'
import {
  Eye,
  Users,
  Clock,
  Target,
  Activity,
  MousePointerClick,
} from 'lucide-react'

// Map icon names to components (backwards compat)
const iconMap = {
  eye: Eye,
  users: Users,
  clock: Clock,
  target: Target,
  activity: Activity,
  click: MousePointerClick,
}

export function MetricsGrid({
  metrics = [],
  isLoading = false,
  columns = 4
}) {
  // Normalize icon strings to components
  const normalizedMetrics = metrics.map(m => ({
    ...m,
    icon: typeof m.icon === 'string' ? (iconMap[m.icon] || Eye) : m.icon,
  }))

  return (
    <StatTileGrid
      metrics={normalizedMetrics}
      isLoading={isLoading}
      columns={columns}
      variant="centered"
    />
  )
}

export default MetricsGrid
