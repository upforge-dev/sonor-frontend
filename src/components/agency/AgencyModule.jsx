/**
 * AgencyModule — "Clients" module for agency organizations
 *
 * Lists managed client orgs with stats, search/filter, and create new client flow.
 * Accessible from Sidebar "Clients" nav item for agency users.
 */
import React from 'react'
import ModuleLayout from '@/components/ModuleLayout'
import { Building2 } from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import ClientOrgList from './ClientOrgList'

export default function AgencyModule() {
  const { currentOrg } = useAuthStore()
  const isAgency = currentOrg?.org_type === 'agency'

  if (!isAgency) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        This module is only available for agency organizations.
      </div>
    )
  }

  return (
    <ModuleLayout>
      <ModuleLayout.Header
        icon={Building2}
        title="Clients"
        subtitle="Manage your client organizations"
      />
      <ModuleLayout.Content>
        <ClientOrgList />
      </ModuleLayout.Content>
    </ModuleLayout>
  )
}
