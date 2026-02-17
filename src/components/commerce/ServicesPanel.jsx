// src/components/commerce/ServicesPanel.jsx
// Services panel - booking, duration, availability, appointments

import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Briefcase,
  Plus,
  ChevronRight,
  Clock,
  Calendar,
  DollarSign,
  Video,
  MapPin,
  ArrowRight,
} from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export function ServicesPanel({
  services = [],
  upcomingAppointments = [],
  stats = {},
  compact = false,
  brandColors = {},
  className,
}) {
  const navigate = useNavigate()

  const derivedStats = useMemo(() => {
    if (Object.keys(stats).length > 0) return stats
    const totalServices = services.length
    const activeServices = services.filter((s) => s.status !== 'archived' && s.status !== 'draft').length
    const weekRevenue = services.reduce((sum, s) => sum + (s.revenue || 0), 0)
    return {
      totalServices,
      activeServices,
      todayBookings: upcomingAppointments.filter((a) => {
        const d = a.date ? new Date(a.date) : null
        if (!d) return false
        const today = new Date()
        return d.toDateString() === today.toDateString()
      }).length,
      weekBookings: upcomingAppointments.length,
      weekRevenue,
    }
  }, [services, upcomingAppointments, stats])

  const displayServices = services
  const displayUpcoming = upcomingAppointments

  const secondary = brandColors.secondary || '#39bfb0'
  const rgba = brandColors.rgba || { secondary10: 'rgba(57, 191, 176, 0.1)', secondary20: 'rgba(57, 191, 176, 0.2)' }

  if (compact) {
    return (
      <Card className={cn("border-l-4", className)} style={{ borderLeftColor: secondary }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: rgba.secondary10, color: secondary }}
              >
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Services</p>
                <p className="text-sm text-muted-foreground">{derivedStats.todayBookings ?? 0} today</p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => navigate('/commerce/offerings?type=service')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {displayUpcoming.length > 0 && displayUpcoming[0].date && (
            <div className="mt-3 text-sm">
              <span className="text-muted-foreground">Next:</span>{' '}
              <span className="font-medium">{displayUpcoming[0].service}</span>
              <span className="text-muted-foreground"> at {format(new Date(displayUpcoming[0].date), 'h:mm a')}</span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-l-4", className)} style={{ borderLeftColor: secondary }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl"
              style={{ backgroundColor: rgba.secondary10, color: secondary }}
            >
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Services</CardTitle>
              <CardDescription>Bookable appointments</CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate('/commerce/offerings/new?type=service')}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3">
          <StatBox label="Services" value={derivedStats.totalServices ?? 0} />
          <StatBox label="Today" value={derivedStats.todayBookings ?? 0} />
          <StatBox label="This Week" value={derivedStats.weekBookings ?? 0} />
          <StatBox label="Week Rev" value={`$${Number(derivedStats.weekRevenue ?? 0).toLocaleString()}`} />
        </div>

        {/* Upcoming Appointments */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Upcoming Appointments</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link to="/commerce/schedule">View Calendar</Link>
            </Button>
          </div>
          <div className="space-y-2">
            {displayUpcoming.slice(0, 3).map((appt) => {
              const apptDate = appt.date ? new Date(appt.date) : null
              const initials = appt.customer ? appt.customer.split(' ').map((n) => n[0]).join('') : '?'
              return (
              <div
                key={appt.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                onClick={() => navigate(`/commerce/appointments/${appt.id}`)}
              >
                <div className="flex-shrink-0">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback
                      className="text-xs"
                      style={{ backgroundColor: rgba.secondary10, color: secondary }}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{appt.service}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {appt.customer && <span>{appt.customer}</span>}
                    {appt.customer && apptDate && <span>•</span>}
                    {apptDate && <span>{format(apptDate, 'MMM d, h:mm a')}</span>}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {appt.type === 'virtual' ? (
                    <Badge variant="outline" className="gap-1">
                      <Video className="h-3 w-3" />
                      Virtual
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      In-Person
                    </Badge>
                  )}
                </div>
              </div>
              )
            }))}
            {displayUpcoming.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No upcoming appointments
              </div>
            )}
          </div>
        </div>

        {/* Service List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Your Services</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link to="/commerce/offerings?type=service">View All</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {displayServices.slice(0, 4).map((service) => (
              <div
                key={service.id}
                className="p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/commerce/offerings/${service.id}`)}
              >
                <p className="text-sm font-medium truncate">{service.name}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {service.duration != null && (
                    <>
                      <Clock className="h-3 w-3" />
                      <span>{service.duration} min</span>
                      <span>•</span>
                    </>
                  )}
                  <span>{service.price != null ? `$${service.price}` : ''}</span>
                </div>
              </div>
            ))}
            {displayServices.length === 0 && (
              <div className="col-span-2 text-center py-6 text-muted-foreground text-sm">No services yet</div>
            )}
          </div>
        </div>

        {/* Availability Link */}
        <Button variant="outline" className="w-full justify-between" asChild>
          <Link to="/commerce/availability">
            Manage Availability
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
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

export default ServicesPanel
