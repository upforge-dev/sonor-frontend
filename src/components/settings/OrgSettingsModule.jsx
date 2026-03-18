/**
 * OrgSettings - Organization Settings Page
 *
 * Unified settings page for org-level users including:
 * - Members (invite users, manage roles)
 * - Roles & Permissions
 * - General Settings (org profile, preferences)
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Users,
  Building2,
  ExternalLink,
  AlertCircle,
  Shield,
  ArrowLeft,
  Pencil,
  Save,
  Loader2,
  X
} from 'lucide-react'
import OrganizationUsersPanel from './OrganizationUsersPanel'
import RolesPermissionsPanel from './RolesPermissionsPanel'
import useAuthStore from '@/lib/auth-store'
import { adminApi } from '@/lib/portal-api'
import { toast } from 'sonner'
import { ModuleLayout } from '@/components/ModuleLayout'
import { MODULE_ICONS } from '@/lib/module-icons'
import { UptradeSpinner } from '@/components/UptradeLoading'

export default function OrgSettings() {
  const navigate = useNavigate()
  const { currentOrg, accessLevel, isSuperAdmin } = useAuthStore()
  const [activeTab, setActiveTab] = useState('members')
  const [orgDetails, setOrgDetails] = useState(null)
  const [isLoadingOrg, setIsLoadingOrg] = useState(true)

  // Org rename state
  const [editingName, setEditingName] = useState(false)
  const [orgNameDraft, setOrgNameDraft] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)

  // Access control
  const hasOrgLevelAccess = isSuperAdmin || accessLevel === 'organization'
  const canManageMembers = hasOrgLevelAccess

  useEffect(() => {
    if (currentOrg?.id) {
      fetchOrgDetails()
    }
  }, [currentOrg?.id])

  const fetchOrgDetails = async () => {
    try {
      setIsLoadingOrg(true)
      const response = await adminApi.getOrganization(currentOrg.id)
      const data = response.data || response
      setOrgDetails(data)
    } catch (err) {
      console.error('Failed to fetch org details:', err)
      toast.error('Failed to load organization details')
    } finally {
      setIsLoadingOrg(false)
    }
  }

  const handleSaveOrgName = async () => {
    const trimmed = orgNameDraft.trim()
    if (!trimmed) {
      toast.error('Organization name cannot be empty')
      return
    }
    setIsSavingName(true)
    try {
      await adminApi.updateOrgSettings(currentOrg.id, { name: trimmed })
      setOrgDetails(prev => ({ ...prev, name: trimmed }))
      const updatedOrg = { ...currentOrg, name: trimmed }
      useAuthStore.getState().setOrganization(updatedOrg)
      localStorage.setItem('currentOrganization', JSON.stringify(updatedOrg))
      setEditingName(false)
      toast.success('Organization name updated')
    } catch (err) {
      console.error('Failed to update org name:', err)
      toast.error('Failed to update organization name')
    } finally {
      setIsSavingName(false)
    }
  }

  // Redirect if not org-level user
  if (!hasOrgLevelAccess) {
    return (
      <div className="h-full min-h-0 flex items-center justify-center bg-[var(--surface-primary)]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              Organization settings are only available to org-level users.
            </p>
            <Button onClick={() => navigate('/')}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentOrg) {
    return (
      <div className="h-full min-h-0 flex items-center justify-center bg-[var(--surface-primary)]">
        <UptradeSpinner />
      </div>
    )
  }

  return (
    <div data-sonor-help="settings/organization">
    <ModuleLayout>
      <ModuleLayout.Header
        title="Organization Settings"
        icon={MODULE_ICONS.organization}
        breadcrumbs={currentOrg?.name ? [{ label: currentOrg.name }] : undefined}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        }
      />
      <ModuleLayout.Content>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Members</span>
              <span className="sm:hidden">Team</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Roles</span>
              <span className="sm:hidden">Roles</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Org</span>
            </TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <OrganizationUsersPanel
              organizationId={currentOrg.id}
              organizationName={currentOrg.name}
              canManage={canManageMembers}
            />
          </TabsContent>

          {/* Roles & Permissions Tab */}
          <TabsContent value="roles" className="space-y-6">
            <RolesPermissionsPanel
              organizationId={currentOrg.id}
              isAgency={currentOrg.org_type === 'agency'}
              canManageRoles={hasOrgLevelAccess}
            />
          </TabsContent>

          {/* General Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Organization Profile */}
            <Card>
              <CardHeader>
                <CardTitle>Organization Profile</CardTitle>
                <CardDescription>
                  Basic information about your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingOrg ? (
                  <div className="flex items-center justify-center py-12">
                    <UptradeSpinner />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Organization Name</Label>
                        {editingName ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={orgNameDraft}
                              onChange={(e) => setOrgNameDraft(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveOrgName()
                                if (e.key === 'Escape') setEditingName(false)
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={handleSaveOrgName}
                              disabled={isSavingName}
                            >
                              {isSavingName ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingName(false)}
                              disabled={isSavingName}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              value={orgDetails?.name || ''}
                              disabled
                              className="bg-[var(--surface-secondary)]"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setOrgNameDraft(orgDetails?.name || '')
                                setEditingName(true)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Domain</Label>
                        <Input
                          value={orgDetails?.domain || ''}
                          disabled
                          className="bg-[var(--surface-secondary)]"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Organization ID</Label>
                      <Input
                        value={currentOrg.id}
                        disabled
                        className="bg-[var(--surface-secondary)] font-mono text-sm"
                      />
                    </div>

                    {orgDetails?.website && (
                      <div className="space-y-2">
                        <Label>Website</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={orgDetails.website}
                            disabled
                            className="bg-[var(--surface-secondary)]"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(orgDetails.website, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </ModuleLayout.Content>
    </ModuleLayout>
    </div>
  )
}
