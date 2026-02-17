// src/components/commerce/EventsPanel.jsx
// Events panel - dates, tickets, capacity, venues (real data only)

import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CalendarDays,
  Plus,
  ChevronRight,
  Clock,
  Users,
  MapPin,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, differenceInDays } from 'date-fns'

/**
 * Normalize API offering (with schedules) into a flat shape for display.
 * Supports: next_schedule.starts_at, schedules[0].starts_at, capacity, spots_remaining, location.
 */
function normalizeEvent(event) {
  const schedule = event.next_schedule || event.schedules?.[0]
  const startsAt = schedule?.starts_at || event.starts_at
  const date = startsAt ? new Date(startsAt) : null
  const capacity = schedule?.capacity ?? event.capacity ?? null
  const spotsRemaining = schedule?.spots_remaining ?? null
  const sold = capacity != null && spotsRemaining != null ? capacity - spotsRemaining : event.sales_count ?? 0
  const location = event.location || schedule?.location || null
  const isVirtual = event.is_virtual ?? false
  return {
    id: event.id,
    name: event.name || event.title,
    date,
    capacity,
    sold,
    price: event.price,
    venue: location,
    type: isVirtual ? 'virtual' : 'in_person',
  }
}

export function EventsPanel({
  events = [],
  upcomingEvents = [],
  stats = {},
  compact = false,
  brandColors = {},
  className,
}) {
  const navigate = useNavigate()

  const upcomingFromEvents = useMemo(() => {
    const now = new Date()
    return events
      .filter((e) => {
        const s = e.next_schedule || e.schedules?.[0]
        const at = s?.starts_at ? new Date(s.starts_at) : null
        return at && at >= now
      })
      .map(normalizeEvent)
      .sort((a, b) => (a.date && b.date ? a.date - b.date : 0))
  }, [events])

  const displayUpcoming = upcomingEvents.length > 0
    ? upcomingEvents.map((e) => (e.date ? e : normalizeEvent(e)))
    : upcomingFromEvents

  const derivedStats = useMemo(() => {
    if (Object.keys(stats).length > 0) return stats
    const totalEvents = events.length
    const upcomingCount = displayUpcoming.length
    const ticketsSold = events.reduce((sum, e) => sum + (e.sales_count || 0), 0)
    const totalRevenue = events.reduce((sum, e) => sum + (e.revenue || e.total_revenue || 0), 0)
    return {
      totalEvents,
      upcomingEvents: upcomingCount,
      ticketsSold,
      totalRevenue,
    }
  }, [events, displayUpcoming.length, stats])

  const secondary = brandColors.secondary || '#39bfb0'
  const rgba = brandColors.rgba || { secondary10: 'rgba(57, 191, 176, 0.1)', secondary20: 'rgba(57, 191, 176, 0.2)' }

  if (compact) {
    return (
      <Card className={cn('border-l-4', className)} style={{ borderLeftColor: secondary }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: rgba.secondary10, color: secondary }}
              >
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Events</p>
                <p className="text-sm text-muted-foreground">{derivedStats.upcomingEvents ?? 0} upcoming</p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => navigate('/commerce/offerings?type=event')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {displayUpcoming.length > 0 && displayUpcoming[0].date && (
            <div className="mt-3 text-sm">
              <span className="text-muted-foreground">Next:</span>{' '}
              <span className="font-medium">{displayUpcoming[0].name}</span>
              <span className="text-muted-foreground">
                {' '}
                in {differenceInDays(displayUpcoming[0].date, new Date())} days
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border-l-4', className)} style={{ borderLeftColor: secondary }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl"
              style={{ backgroundColor: rgba.secondary10, color: secondary }}
            >
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Events</CardTitle>
              <CardDescription>Ticketed experiences</CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate('/commerce/offerings/new?type=event')}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <StatBox label="Events" value={derivedStats.totalEvents ?? 0} />
          <StatBox label="Upcoming" value={derivedStats.upcomingEvents ?? 0} />
          <StatBox label="Sold" value={derivedStats.ticketsSold ?? 0} />
          <StatBox label="Revenue" value={`$${Number(derivedStats.totalRevenue || 0).toLocaleString()}`} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Upcoming Events</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link to="/commerce/offerings?type=event">View All</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {displayUpcoming.slice(0, 3).map((event) => {
              const date = event.date
              const daysUntil = date ? differenceInDays(date, new Date()) : null
              const capacity = event.capacity ?? 0
              const sold = event.sold ?? 0
              const fillPercent = capacity > 0 ? Math.round((sold / capacity) * 100) : 0
              const isAlmostFull = fillPercent >= 80

              return (
                <div
                  key={event.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/commerce/offerings/${event.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{event.name}</h4>
                      {date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>{format(date, 'EEEE, MMMM d, yyyy')}</span>
                        </div>
                      )}
                    </div>
                    {daysUntil != null && (
                      <Badge
                        variant={daysUntil <= 3 ? 'default' : 'outline'}
                        className={daysUntil <= 3 ? 'bg-amber-500' : ''}
                      >
                        {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      {event.type === 'virtual' ? (
                        <>
                          <Video className="h-3.5 w-3.5" />
                          <span>Virtual</span>
                        </>
                      ) : event.venue ? (
                        <>
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{event.venue}</span>
                        </>
                      ) : null}
                    </div>
                    <div className="flex-1" />
                    {capacity > 0 && (
                      <div className="flex items-center gap-2">
                        <span className={cn('font-medium', isAlmostFull && 'text-amber-600')}>
                          {sold}/{capacity}
                        </span>
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${fillPercent}%`,
                              backgroundColor: isAlmostFull ? '#f59e0b' : secondary,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {displayUpcoming.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">No upcoming events</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/commerce/events/calendar">
              <CalendarDays className="h-4 w-4 mr-2" />
              Event Calendar
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/commerce/events/attendees">
              <Users className="h-4 w-4 mr-2" />
              Attendees
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function StatBox({ label, value }) {
  return (
    <div className="p-2 rounded-lg bg-muted/50 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

export default EventsPanel
