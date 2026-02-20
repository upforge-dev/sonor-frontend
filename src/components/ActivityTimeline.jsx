import { useEffect, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { reportsApi } from '@/lib/portal-api'

const activityTypeConfig = {
  project: { icon: '📁', color: 'bg-[var(--brand-primary)]/20', textColor: 'text-[var(--brand-primary)]' },
  invoice: { icon: '📄', color: 'bg-green-100', textColor: 'text-green-700' },
  message: { icon: '💬', color: 'bg-purple-100', textColor: 'text-purple-700' },
  proposal: { icon: '✅', color: 'bg-orange-100', textColor: 'text-orange-700' },
  file: { icon: '📎', color: 'bg-pink-100', textColor: 'text-pink-700' }
}

const actionText = {
  created: 'Created',
  updated: 'Updated',
  completed: 'Completed',
  viewed: 'Viewed',
  paid: 'Paid',
  received: 'Received',
  accepted: 'Accepted',
  declined: 'Declined'
}

export function ActivityTimeline({ limit = 10 }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchActivities()
  }, [limit])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      const response = await reportsApi.getActivity({ limit, offset: 0 })
      setActivities(response.data.activities || [])
      setError(null)
    } catch (err) {
      console.error('Failed to fetch activities:', err)
      setError('Failed to load activity')
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-[var(--text-secondary)]">{error}</p>
            <button
              onClick={fetchActivities}
              className="mt-3 text-sm text-[var(--brand-primary)] hover:underline"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--text-tertiary)]" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[var(--text-secondary)]">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const config = activityTypeConfig[activity.type] || activityTypeConfig.project
              const timestamp = new Date(activity.timestamp)
              
              return (
                <div
                  key={`${activity.related_id}-${activity.type}-${index}`}
                  className="flex gap-3 pb-4 border-b last:border-0 last:pb-0 hover:bg-[var(--surface-secondary)] -mx-2 px-2 py-2 rounded transition-colors"
                >
                  <div className={`${config.color} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <span className="text-lg">{config.icon}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-[var(--text-primary)] truncate">
                          {activity.title}
                        </p>
                        <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                          {activity.description}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {actionText[activity.action] || activity.action}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-tertiary)]">
                      <span>{formatDistanceToNow(timestamp, { addSuffix: true })}</span>
                      {activity.user_email && activity.user_email !== 'You' && (
                        <>
                          <span>•</span>
                          <span className="truncate">{activity.user_email}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ActivityTimeline
