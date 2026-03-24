/**
 * RolesPermissionsPanel - Manage organization roles and permissions
 * 
 * Features:
 * - View all available roles (system defaults + org custom)
 * - Edit role permissions (for admins)
 * - Create custom roles based on templates
 * - Different views for agency vs client orgs
 */
import { useState, useEffect, useMemo } from 'react'
import { 
  Shield, 
  Plus, 
  Users,
  Crown,
  Settings,
  Eye,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Copy,
  Lock,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase-auth'
import useAuthStore from '@/lib/auth-store'
import { adminApi } from '@/lib/sonor-api'
import { UptradeSpinner } from '@/components/UptradeLoading'

// Permission labels for display
const PERMISSION_LABELS = {
  can_assign_tasks: { label: 'Assign Tasks', description: 'Can assign tasks to other team members' },
  can_approve_actions: { label: 'Approve Signal Actions', description: 'Can approve AI-generated actions before execution' },
  can_manage_users: { label: 'Manage Users', description: 'Can invite, edit, and remove team members' },
  can_manage_billing: { label: 'Manage Billing', description: 'Can view invoices and manage payment methods' },
  can_access_all_projects: { label: 'Access All Projects', description: 'Can view all projects vs only assigned ones' },
  can_manage_roles: { label: 'Manage Roles', description: 'Can edit role permissions and create custom roles' },
  can_view_reports: { label: 'View Reports', description: 'Can view analytics and reports' },
  can_edit_content: { label: 'Edit Content', description: 'Can create and edit content across modules' },
  can_delete_content: { label: 'Delete Content', description: 'Can permanently delete content' },
  can_manage_integrations: { label: 'Manage Integrations', description: 'Can connect and configure third-party integrations' },
}

// Role icon mapping
const getRoleIcon = (slug) => {
  if (slug.includes('owner') || slug.includes('agency_owner')) return Crown
  if (slug.includes('admin')) return Shield
  if (slug.includes('manager')) return Settings
  if (slug.includes('viewer')) return Eye
  return Users
}

export default function RolesPermissionsPanel({ organizationId, isAgency = false, canManageRoles = true }) {
  const { currentOrg } = useAuthStore()
  const [roles, setRoles] = useState([])
  const [orgSettings, setOrgSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rolesError, setRolesError] = useState(null)
  const [expandedRole, setExpandedRole] = useState(null)
  
  // Edit role dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [editFormData, setEditFormData] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  
  // Create role dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    name: '',
    slug: '',
    description: '',
    template_role_id: null,
  })
  const [isCreating, setIsCreating] = useState(false)

  // Fetch roles and settings
  useEffect(() => {
    if (organizationId) {
      fetchRolesAndSettings()
    }
  }, [organizationId])

  const fetchRolesAndSettings = async () => {
    if (!organizationId) return
    try {
      setLoading(true)
      setRolesError(null)

      // Fetch roles via Portal API (avoids client RLS/table issues)
      const scope = isAgency ? 'agency' : 'organization'
      const response = await adminApi.listOrgRoles(organizationId, scope)
      const data = response?.data || response
      const rolesList = data?.roles ?? []
      setRoles(Array.isArray(rolesList) ? rolesList : [])

      // Optional: org-level config from Supabase (fallback if table/RLS missing)
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from('organization_settings')
          .select('*')
          .eq('org_id', organizationId)
          .single()
        if (!settingsError || settingsError.code === 'PGRST116') {
          setOrgSettings(settingsData || null)
        }
      } catch {
        // organization_settings may not exist or RLS may block; ignore
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err)
      setRolesError(err?.response?.data?.message || err?.message || 'Failed to load roles')
      setRoles([])
    } finally {
      setLoading(false)
    }
  }

  // Count users per role
  const [userCounts, setUserCounts] = useState({})
  
  useEffect(() => {
    if (roles.length > 0 && organizationId) {
      fetchUserCounts()
    }
  }, [roles, organizationId])
  
  const fetchUserCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('user_organizations')
        .select('role_id')
        .eq('org_id', organizationId)
      
      if (error) throw error
      
      const counts = {}
      data?.forEach(uo => {
        if (uo.role_id) {
          counts[uo.role_id] = (counts[uo.role_id] || 0) + 1
        }
      })
      setUserCounts(counts)
    } catch (err) {
      console.error('Failed to fetch user counts:', err)
    }
  }

  // Separate system roles from custom roles
  const { systemRoles, customRoles } = useMemo(() => {
    const system = roles.filter(r => r.is_system_role && r.org_id === null)
    const custom = roles.filter(r => !r.is_system_role || r.org_id === organizationId)
    return { systemRoles: system, customRoles: custom }
  }, [roles, organizationId])

  // Open edit dialog
  const handleEditRole = (role) => {
    setEditingRole(role)
    setEditFormData({
      name: role.name,
      description: role.description || '',
      can_assign_tasks: role.can_assign_tasks,
      can_approve_actions: role.can_approve_actions,
      can_manage_users: role.can_manage_users,
      can_manage_billing: role.can_manage_billing,
      can_access_all_projects: role.can_access_all_projects,
      can_manage_roles: role.can_manage_roles,
      can_view_reports: role.can_view_reports,
      can_edit_content: role.can_edit_content,
      can_delete_content: role.can_delete_content,
      can_manage_integrations: role.can_manage_integrations,
    })
    setEditDialogOpen(true)
  }

  // Save role changes (via Portal API)
  const handleSaveRole = async () => {
    if (!editingRole) return

    setIsSaving(true)
    try {
      const scope = isAgency ? 'agency' : 'organization'
      const permPayload = Object.fromEntries(
        Object.keys(PERMISSION_LABELS).map(key => [key, editFormData[key]])
      )

      if (editingRole.is_system_role && editingRole.org_id === null) {
        // Create org-specific override of system role via API
        const response = await adminApi.createOrgRole(organizationId, {
          name: editFormData.name,
          slug: editingRole.slug,
          description: editFormData.description || undefined,
          scope,
          template_role_id: editingRole.id,
          ...permPayload,
        })
        const data = response?.data ?? response
        setRoles(prev => [...prev, data])
        toast.success('Role customized for your organization')
      } else {
        // Update existing custom role via API
        await adminApi.updateOrgRole(organizationId, editingRole.id, {
          name: editFormData.name,
          description: editFormData.description || undefined,
          ...permPayload,
        })
        setRoles(prev =>
          prev.map(r =>
            r.id === editingRole.id
              ? { ...r, ...editFormData, updated_at: new Date().toISOString() }
              : r
          )
        )
        toast.success('Role updated successfully')
      }

      setEditDialogOpen(false)
    } catch (err) {
      console.error('Failed to save role:', err)
      toast.error(err?.response?.data?.message || 'Failed to save role changes')
    } finally {
      setIsSaving(false)
    }
  }

  // Create new custom role (via Portal API)
  const handleCreateRole = async () => {
    if (!createFormData.name.trim()) {
      toast.error('Role name is required')
      return
    }

    setIsCreating(true)
    try {
      const scope = isAgency ? 'agency' : 'organization'
      const body = {
        name: createFormData.name.trim(),
        slug: createFormData.slug.trim() || undefined,
        description: createFormData.description.trim() || undefined,
        scope,
        template_role_id: createFormData.template_role_id || undefined,
      }
      const response = await adminApi.createOrgRole(organizationId, body)
      const data = response?.data ?? response
      setRoles(prev => [...prev, data])
      toast.success(`Role "${createFormData.name}" created`)
      setCreateDialogOpen(false)
      setCreateFormData({ name: '', slug: '', description: '', template_role_id: null })
    } catch (err) {
      console.error('Failed to create role:', err)
      const msg = err?.response?.data?.message || err?.message
      if (msg?.includes('unique') || err?.response?.status === 409) {
        toast.error('A role with this name already exists')
      } else {
        toast.error(msg || 'Failed to create role')
      }
    } finally {
      setIsCreating(false)
    }
  }

  // Delete custom role (via Portal API)
  const handleDeleteRole = async (role) => {
    if (role.is_system_role && role.org_id === null) {
      toast.error('Cannot delete system roles')
      return
    }

    if (userCounts[role.id] > 0) {
      toast.error('Cannot delete role with assigned users. Reassign users first.')
      return
    }

    try {
      await adminApi.deleteOrgRole(organizationId, role.id)
      setRoles(prev => prev.filter(r => r.id !== role.id))
      toast.success('Role deleted')
    } catch (err) {
      console.error('Failed to delete role:', err)
      toast.error(err?.response?.data?.message || 'Failed to delete role')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <UptradeSpinner />
        </CardContent>
      </Card>
    )
  }

  if (rolesError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <AlertCircle className="h-12 w-12 text-amber-500" />
          <p className="text-[var(--text-secondary)] text-center">Unable to load roles.</p>
          <Button variant="outline" onClick={() => fetchRolesAndSettings()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const hasNoRoles = systemRoles.length === 0 && customRoles.length === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                Roles & Permissions
              </CardTitle>
              <CardDescription>
                {isAgency 
                  ? 'Manage roles for agency staff members'
                  : 'Define what team members can do in your organization'}
              </CardDescription>
            </div>
            {canManageRoles && (
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Role
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {hasNoRoles ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
            <Shield className="h-12 w-12 text-[var(--text-tertiary)]" />
            <p className="text-[var(--text-secondary)]">No roles yet.</p>
            <p className="text-sm text-[var(--text-tertiary)]">
              Default roles will appear here once configured for your organization.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
      {/* System Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-4 w-4 text-[var(--text-tertiary)]" />
            Default Roles
          </CardTitle>
          <CardDescription>
            Standard roles available to all organizations. Click to customize permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {systemRoles.map((role) => {
            const Icon = getRoleIcon(role.slug)
            const isExpanded = expandedRole === role.id
            const hasOrgOverride = customRoles.some(r => r.slug === role.slug)
            
            return (
              <Collapsible 
                key={role.id} 
                open={isExpanded}
                onOpenChange={() => setExpandedRole(isExpanded ? null : role.id)}
              >
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--surface-secondary)] transition-colors">
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
                        >
                          <Icon className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{role.name}</h4>
                            <Badge variant="secondary" className="text-xs">System</Badge>
                            {hasOrgOverride && (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                                Customized
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-[var(--text-secondary)]">
                            {role.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-[var(--text-tertiary)]">
                          {userCounts[role.id] || 0} {(userCounts[role.id] || 0) === 1 ? 'user' : 'users'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-[var(--text-tertiary)]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-0">
                      <div className="border-t pt-4">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {Object.entries(PERMISSION_LABELS).map(([key, { label }]) => (
                            <div key={key} className="flex items-center gap-2 text-sm">
                              {role[key] ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <X className="h-4 w-4 text-[var(--text-tertiary)]" />
                              )}
                              <span className={role[key] ? '' : 'text-[var(--text-tertiary)]'}>
                                {label}
                              </span>
                            </div>
                          ))}
                        </div>
                        {canManageRoles && (
                          <div className="mt-4 flex justify-end">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditRole(role)
                              }}
                              className="gap-2"
                            >
                              <Edit3 className="h-3 w-3" />
                              Customize Permissions
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )
          })}
        </CardContent>
      </Card>

      {/* Custom Roles */}
      {customRoles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Custom Roles</CardTitle>
            <CardDescription>
              Roles created specifically for your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {customRoles.map((role) => {
              const Icon = getRoleIcon(role.slug)
              const isExpanded = expandedRole === role.id
              
              return (
                <Collapsible 
                  key={role.id} 
                  open={isExpanded}
                  onOpenChange={() => setExpandedRole(isExpanded ? null : role.id)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--surface-secondary)] transition-colors">
                        <div className="flex items-center gap-3">
                          <div 
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
                          >
                            <Icon className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{role.name}</h4>
                              <Badge variant="outline" className="text-xs">Custom</Badge>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)]">
                              {role.description || 'No description'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-[var(--text-tertiary)]">
                            {userCounts[role.id] || 0} {(userCounts[role.id] || 0) === 1 ? 'user' : 'users'}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-[var(--text-tertiary)]" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 pt-0">
                        <div className="border-t pt-4">
                          <div className="grid gap-2 sm:grid-cols-2">
                            {Object.entries(PERMISSION_LABELS).map(([key, { label }]) => (
                              <div key={key} className="flex items-center gap-2 text-sm">
                                {role[key] ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <X className="h-4 w-4 text-[var(--text-tertiary)]" />
                                )}
                                <span className={role[key] ? '' : 'text-[var(--text-tertiary)]'}>
                                  {label}
                                </span>
                              </div>
                            ))}
                          </div>
                          {canManageRoles && (
                            <div className="mt-4 flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteRole(role)
                                }}
                                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditRole(role)
                                }}
                                className="gap-2"
                              >
                                <Edit3 className="h-3 w-3" />
                                Edit
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )
            })}
          </CardContent>
        </Card>
      )}
        </>
      )}

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole?.is_system_role && editingRole?.org_id === null
                ? `Customize "${editingRole?.name}" Role`
                : `Edit "${editingRole?.name}" Role`}
            </DialogTitle>
            <DialogDescription>
              {editingRole?.is_system_role && editingRole?.org_id === null
                ? 'Create a customized version of this system role for your organization'
                : 'Update the permissions for this role'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role-name">Role Name</Label>
                <Input
                  id="role-name"
                  value={editFormData.name || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Content Editor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-description">Description</Label>
                <Textarea
                  id="role-description"
                  value={editFormData.description || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of what this role can do"
                  rows={2}
                />
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Permissions</Label>
              {Object.entries(PERMISSION_LABELS).map(([key, { label, description }]) => (
                <div 
                  key={key} 
                  className="flex items-start justify-between p-3 rounded-lg border hover:bg-[var(--surface-secondary)] transition-colors"
                >
                  <div className="space-y-0.5">
                    <Label htmlFor={key} className="cursor-pointer">{label}</Label>
                    <p className="text-xs text-[var(--text-tertiary)]">{description}</p>
                  </div>
                  <Switch
                    id={key}
                    checked={editFormData[key] || false}
                    onCheckedChange={(checked) => 
                      setEditFormData(prev => ({ ...prev, [key]: checked }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={isSaving}>
              {isSaving && <UptradeSpinner size="sm" className="mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Role Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Role</DialogTitle>
            <DialogDescription>
              Create a new role with specific permissions for your team
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-role-name">Role Name *</Label>
              <Input
                id="new-role-name"
                value={createFormData.name}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Content Editor"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-role-description">Description</Label>
              <Textarea
                id="new-role-description"
                value={createFormData.description}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What can this role do?"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="template-role">Start from Template (Optional)</Label>
              <Select
                value={createFormData.template_role_id || ''}
                onValueChange={(value) => 
                  setCreateFormData(prev => ({ ...prev, template_role_id: value || null }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role to copy permissions from" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No template (start from scratch)</SelectItem>
                  {systemRoles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[var(--text-tertiary)]">
                You can customize permissions after creating the role
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateRole} 
              disabled={isCreating || !createFormData.name.trim()}
            >
              {isCreating && <UptradeSpinner size="sm" className="mr-2" />}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
