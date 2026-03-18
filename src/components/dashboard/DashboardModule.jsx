import useAuthStore from '@/lib/auth-store'
import TenantDashboard from '@/components/TenantDashboard'
import AgencyDashboard from '@/components/dashboard/AgencyDashboard'

const Dashboard = ({ onNavigate }) => {
  const { currentOrg, currentProject } = useAuthStore()

  // Agency org: no project/org context = agency home
  const isAgencyOrg = currentOrg?.org_type === 'agency'
  const isInTenantContext =
    (!!currentProject && !isAgencyOrg) || (!!currentOrg && !isAgencyOrg)

  if (isInTenantContext) {
    return <div data-sonor-help="dashboard/overview"><TenantDashboard onNavigate={onNavigate} /></div>
  }

  return <div data-sonor-help="dashboard/overview"><AgencyDashboard onNavigate={onNavigate} /></div>
}

export default Dashboard
