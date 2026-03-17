import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Building2, Users, ArrowRight, Loader2 } from 'lucide-react'
import { useTenants } from '@/lib/hooks/use-platform'
import { EmptyState } from '@/components/EmptyState'

const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })

const STATUS_COLORS = {
  active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  trial: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  suspended: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  churned: 'bg-red-500/10 text-red-600 border-red-500/20',
  pending: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
}

const PLAN_COLORS = {
  free: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  starter: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  pro: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  enterprise: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
}

const TYPE_COLORS = {
  agency: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  business: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
}

export default function TenantList({ onSelectTenant }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const filters = useMemo(() => {
    const f = {}
    if (search) f.search = search
    if (typeFilter !== 'all') f.org_type = typeFilter
    if (planFilter !== 'all') f.billing_plan = planFilter
    if (statusFilter !== 'all') f.billing_status = statusFilter
    return f
  }, [search, typeFilter, planFilter, statusFilter])

  const { data, isLoading } = useTenants(filters)
  const tenants = data?.tenants || data || []

  const formatDate = (dateStr) => {
    if (!dateStr) return '--'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
          <Input
            placeholder="Search by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="agency">Agency</SelectItem>
            <SelectItem value="business">Business</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="churned">Churned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tenant Count */}
      <p className="text-sm text-[var(--text-secondary)]">
        {tenants.length} tenant{tenants.length !== 1 ? 's' : ''}
      </p>

      {/* Tenant Cards */}
      {tenants.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No tenants found"
          description="No organizations match the current filters."
        />
      ) : (
        <div className="space-y-2">
          {tenants.map((tenant) => (
            <Card
              key={tenant.id}
              className="cursor-pointer hover:border-[var(--brand-primary)]/30 transition-colors"
              onClick={() => onSelectTenant?.(tenant.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Left: Name + badges */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-[var(--brand-primary)]/10 shrink-0">
                      <Building2 className="h-4 w-4 text-[var(--brand-primary)]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text-primary)] truncate">
                          {tenant.name}
                        </span>
                        <Badge variant="outline" className={TYPE_COLORS[tenant.org_type] || TYPE_COLORS.business}>
                          {tenant.org_type || 'business'}
                        </Badge>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                        {tenant.slug || tenant.id}
                      </p>
                    </div>
                  </div>

                  {/* Middle: Plan + MRR */}
                  <div className="hidden md:flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <Badge variant="outline" className={PLAN_COLORS[tenant.billing_plan] || PLAN_COLORS.free}>
                        {tenant.billing_plan || 'free'}
                      </Badge>
                    </div>
                    <div className="text-center w-20">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {currencyFmt.format(tenant.mrr || 0)}
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)]">MRR</p>
                    </div>
                    <div className="text-center w-16">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {tenant.project_count ?? tenant.projects_count ?? 0}
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)]">Projects</p>
                    </div>
                    <div className="text-center w-12">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {tenant.seat_count ?? tenant.seats_used ?? 0}
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)]">Seats</p>
                    </div>
                  </div>

                  {/* Right: Status + last activity */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden lg:block text-right">
                      <p className="text-xs text-[var(--text-secondary)]">
                        {formatDate(tenant.last_activity_at || tenant.updated_at)}
                      </p>
                    </div>
                    <Badge variant="outline" className={STATUS_COLORS[tenant.billing_status] || STATUS_COLORS.pending}>
                      {tenant.billing_status || 'pending'}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-[var(--text-secondary)]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
