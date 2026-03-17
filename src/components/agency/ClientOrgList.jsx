/**
 * ClientOrgList — Agency's managed client organizations
 *
 * Shows all client orgs managed by the current agency with search/filter,
 * project counts, billing info, and quick actions.
 */
import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Building2, Plus, Search, ExternalLink, Loader2, Users, FolderOpen
} from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import { useManagedOrgs, useAgencyStats } from '@/lib/hooks/use-agencies'
import CreateClientOrg from './CreateClientOrg'

const PLAN_LABELS = {
  free: 'Free',
  standard: 'Standard',
  limited_ai: 'Limited AI',
  full_signal: 'Full Signal AI',
  agency: 'Agency',
}

const STATUS_COLORS = {
  active: 'default',
  trialing: 'secondary',
  past_due: 'destructive',
  canceled: 'outline',
  paused: 'secondary',
}

export default function ClientOrgList() {
  const { switchOrganization } = useAuthStore()
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)

  const filters = {
    ...(search && { search }),
    ...(planFilter !== 'all' && { billingPlan: planFilter }),
  }

  const { data, isLoading } = useManagedOrgs(filters)
  const { data: stats } = useAgencyStats()

  const organizations = data?.organizations || []
  const total = data?.total || 0

  const handleSwitchToClient = async (orgId) => {
    await switchOrganization(orgId)
  }

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{stats.managedOrgs}</div>
                  <div className="text-sm text-muted-foreground">Client Orgs</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">
                    {stats.activeProjects}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      / {stats.totalProjects}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">Active Projects</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center justify-center">
              <Button onClick={() => setShowCreate(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                New Client
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="limited_ai">Limited AI</SelectItem>
            <SelectItem value="full_signal">Full Signal AI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Client Org List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : organizations.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {search ? 'No clients match your search.' : 'No client organizations yet.'}
          </p>
          <Button variant="outline" onClick={() => setShowCreate(true)} className="mt-4 gap-2">
            <Plus className="h-4 w-4" />
            Add Your First Client
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {organizations.map((org) => (
            <Card
              key={org.id}
              className="hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => handleSwitchToClient(org.id)}
            >
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    {org.logo_url ? (
                      <img src={org.logo_url} alt="" className="h-8 w-8 rounded" />
                    ) : (
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{org.name}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {org.domain || org.slug}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge variant="outline">
                    {PLAN_LABELS[org.billing_plan] || org.billing_plan}
                  </Badge>
                  {org.billing_exempt && (
                    <Badge variant="secondary">Exempt</Badge>
                  )}
                  <Badge variant={STATUS_COLORS[org.billing_status] || 'outline'}>
                    {org.billing_status}
                  </Badge>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}

          {total > organizations.length && (
            <p className="text-sm text-muted-foreground text-center pt-2">
              Showing {organizations.length} of {total} clients
            </p>
          )}
        </div>
      )}

      {/* Create Client Modal */}
      {showCreate && (
        <CreateClientOrg
          open={showCreate}
          onOpenChange={setShowCreate}
        />
      )}
    </div>
  )
}
