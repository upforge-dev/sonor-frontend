import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Building2, Users, FolderOpen, CreditCard, Loader2, Check } from 'lucide-react'
import { useTenantDetail, useUpdateTenantPlan, useUpdateTenantStatus } from '@/lib/hooks/use-platform'
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

const PLANS = ['free', 'starter', 'pro', 'enterprise']
const STATUSES = ['active', 'trial', 'suspended', 'churned', 'pending']

export default function TenantDetail({ tenantId, onBack }) {
  const { data: tenant, isLoading } = useTenantDetail(tenantId)
  const updatePlan = useUpdateTenantPlan()
  const updateStatus = useUpdateTenantStatus()

  const [selectedPlan, setSelectedPlan] = useState(null)
  const [selectedStatus, setSelectedStatus] = useState(null)

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

  if (!tenant) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tenants
        </Button>
        <EmptyState icon={Building2} title="Tenant not found" description="This organization could not be loaded." />
      </div>
    )
  }

  const org = tenant.organization || tenant
  const projects = tenant.projects || []
  const members = tenant.members || []
  const currentPlan = selectedPlan || org.billing_plan || 'free'
  const currentStatus = selectedStatus || org.billing_status || 'pending'

  const handlePlanChange = (plan) => {
    setSelectedPlan(plan)
  }

  const handleStatusChange = (status) => {
    setSelectedStatus(status)
  }

  const savePlan = () => {
    if (selectedPlan && selectedPlan !== org.billing_plan) {
      updatePlan.mutate({ tenantId, plan: selectedPlan }, {
        onSuccess: () => setSelectedPlan(null),
      })
    }
  }

  const saveStatus = () => {
    if (selectedStatus && selectedStatus !== org.billing_status) {
      updateStatus.mutate({ tenantId, status: selectedStatus }, {
        onSuccess: () => setSelectedStatus(null),
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Back button + Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-3">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tenants
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-[var(--brand-primary)]/10">
            <Building2 className="h-5 w-5 text-[var(--brand-primary)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{org.name}</h2>
              <Badge variant="outline" className={TYPE_COLORS[org.org_type] || TYPE_COLORS.business}>
                {org.org_type || 'business'}
              </Badge>
              <Badge variant="outline" className={PLAN_COLORS[currentPlan]}>
                {currentPlan}
              </Badge>
              <Badge variant="outline" className={STATUS_COLORS[currentStatus]}>
                {currentStatus}
              </Badge>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{org.slug || org.id}</p>
          </div>
        </div>
      </div>

      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Billing Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-[var(--text-secondary)]">MRR</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {currencyFmt.format(org.mrr || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Stripe Customer</p>
              <p className="text-sm font-mono text-[var(--text-primary)] truncate">
                {org.stripe_customer_id || '--'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Stripe Subscription</p>
              <p className="text-sm font-mono text-[var(--text-primary)] truncate">
                {org.stripe_subscription_id || '--'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Created</p>
              <p className="text-sm text-[var(--text-primary)]">
                {formatDate(org.created_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Projects ({projects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-4 text-center">No projects yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--glass-border)]">
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">Name</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">Plan</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">Status</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">Activated</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} className="border-b border-[var(--glass-border)] last:border-0">
                      <td className="py-2 px-3 font-medium text-[var(--text-primary)]">{project.name || project.title}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className={PLAN_COLORS[project.plan] || PLAN_COLORS.free}>
                          {project.plan || 'free'}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className={STATUS_COLORS[project.status] || STATUS_COLORS.pending}>
                          {project.status || 'active'}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-[var(--text-secondary)]">{formatDate(project.activated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-4 text-center">No members</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--glass-bg)]">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">{member.email}</p>
                  </div>
                  <Badge variant="outline">{member.role || 'member'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Change Plan */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Change Plan</label>
              <div className="flex items-center gap-2">
                <Select value={currentPlan} onValueChange={handlePlanChange}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLANS.map((plan) => (
                      <SelectItem key={plan} value={plan} className="capitalize">
                        {plan}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={savePlan}
                  disabled={!selectedPlan || selectedPlan === org.billing_plan || updatePlan.isPending}
                >
                  {updatePlan.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Change Status */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Change Status</label>
              <div className="flex items-center gap-2">
                <Select value={currentStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={saveStatus}
                  disabled={!selectedStatus || selectedStatus === org.billing_status || updateStatus.isPending}
                >
                  {updateStatus.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
