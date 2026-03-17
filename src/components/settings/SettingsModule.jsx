// Settings page: entry to Account Settings (modal) and Organization settings.
// Module toggling is deprecated (modules are defined in project settings).
import { useNavigate } from 'react-router-dom'
import { Settings as SettingsIcon, User, Building2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import useAuthStore from '@/lib/auth-store'
import { useAccountSettingsStore } from '@/lib/account-settings-store'
import { NotificationPreferences } from './NotificationPreferences'

export default function SettingsModule() {
  const navigate = useNavigate()
  const { currentOrg, currentProject, user } = useAuthStore()
  const openAccountSettings = useAccountSettingsStore((s) => s.openModal)

  const activeContext = currentProject || currentOrg
  const isAgencyOrg = currentOrg?.org_type === 'agency'
  const isProjectTenant = (activeContext?.isProjectTenant === true || !!currentProject) && !isAgencyOrg

  if (!activeContext && !user) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <Info className="w-12 h-12 mx-auto text-[var(--text-tertiary)] mb-4" />
          <h2 className="text-lg font-medium text-[var(--text-primary)]">No Organization Selected</h2>
          <p className="text-[var(--text-secondary)] mt-2">Select an organization to manage settings.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
          <p className="text-[var(--text-secondary)] text-sm">
            {activeContext?.name ?? currentOrg?.name} • Account & organization
          </p>
        </div>
      </div>

      {/* Account Settings — opens modal */}
      <div className="mb-8 bg-[var(--surface-secondary)] border border-[var(--glass-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Account Settings</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Update your avatar, name, phone, and email.
        </p>
        <Button onClick={openAccountSettings} variant="default" className="gap-2">
          <User className="w-4 h-4" />
          Open Account Settings
        </Button>
      </div>

      {/* Organization settings link */}
      <div className="mb-8 bg-[var(--surface-secondary)] border border-[var(--glass-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Organization</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Manage organization details and branding.
        </p>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => navigate('/organization')}
        >
          <Building2 className="w-4 h-4" />
          Organization Settings
        </Button>
      </div>

      {/* Notification Preferences */}
      <div className="mt-8">
        <NotificationPreferences />
      </div>
    </div>
  )
}
