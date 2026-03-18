import { useState } from 'react'
import { ModuleLayout } from '@/components/ModuleLayout'
import { MODULE_ICONS } from '@/lib/module-icons'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Building2, DollarSign, UserPlus, Activity, ShieldCheck, Plus, MessageCircle } from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import { Navigate } from 'react-router-dom'
import TenantList from './TenantList'
import TenantDetail from './TenantDetail'
import RevenueDashboard from './RevenueDashboard'
import OnboardingPipeline from './OnboardingPipeline'
import HealthScores from './HealthScores'
import PlatformAdmins from './PlatformAdmins'
import EchoPublicAnalytics from './EchoPublicAnalytics'

const PlatformModule = () => {
  const { isSuperAdmin } = useAuthStore()
  const [activeTab, setActiveTab] = useState('tenants')
  const [selectedTenantId, setSelectedTenantId] = useState(null)

  // Guard: only platform admins can access this module
  if (!isSuperAdmin) {
    return <Navigate to="/" replace />
  }

  const handleSelectTenant = (id) => {
    setSelectedTenantId(id)
  }

  const handleBackToList = () => {
    setSelectedTenantId(null)
  }

  return (
    <ModuleLayout ariaLabel="Platform management">
      <ModuleLayout.Header
        icon={MODULE_ICONS.platform}
        title="Platform"
        subtitle="SaaS management dashboard"
      />
      <ModuleLayout.Content padding="none">
        <div className="p-4 h-full flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedTenantId(null) }} className="flex flex-col flex-1 min-h-0">
            <TabsList className="w-full justify-start border-b border-[var(--glass-border)] rounded-none bg-transparent h-auto p-0 mb-4">
              <TabsTrigger
                value="tenants"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-primary)] data-[state=active]:text-[var(--brand-primary)] data-[state=active]:bg-transparent px-4 py-2.5"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Tenants
              </TabsTrigger>
              <TabsTrigger
                value="revenue"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-primary)] data-[state=active]:text-[var(--brand-primary)] data-[state=active]:bg-transparent px-4 py-2.5"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Revenue
              </TabsTrigger>
              <TabsTrigger
                value="onboarding"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-primary)] data-[state=active]:text-[var(--brand-primary)] data-[state=active]:bg-transparent px-4 py-2.5"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Onboarding
              </TabsTrigger>
              <TabsTrigger
                value="health"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-primary)] data-[state=active]:text-[var(--brand-primary)] data-[state=active]:bg-transparent px-4 py-2.5"
              >
                <Activity className="h-4 w-4 mr-2" />
                Health
              </TabsTrigger>
              <TabsTrigger
                value="admins"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-primary)] data-[state=active]:text-[var(--brand-primary)] data-[state=active]:bg-transparent px-4 py-2.5"
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Admins
              </TabsTrigger>
              <TabsTrigger
                value="echo-analytics"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-primary)] data-[state=active]:text-[var(--brand-primary)] data-[state=active]:bg-transparent px-4 py-2.5"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Echo Analytics
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <TabsContent value="tenants" className="mt-0">
                {selectedTenantId ? (
                  <TenantDetail tenantId={selectedTenantId} onBack={handleBackToList} />
                ) : (
                  <TenantList onSelectTenant={handleSelectTenant} />
                )}
              </TabsContent>

              <TabsContent value="revenue" className="mt-0">
                <RevenueDashboard />
              </TabsContent>

              <TabsContent value="onboarding" className="mt-0">
                <OnboardingPipeline />
              </TabsContent>

              <TabsContent value="health" className="mt-0">
                <HealthScores />
              </TabsContent>

              <TabsContent value="admins" className="mt-0">
                <PlatformAdmins />
              </TabsContent>

              <TabsContent value="echo-analytics" className="mt-0">
                <EchoPublicAnalytics />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </ModuleLayout.Content>
    </ModuleLayout>
  )
}

export default PlatformModule
