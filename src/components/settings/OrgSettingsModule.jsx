/**
 * OrgSettings - Organization Settings Page
 * 
 * Unified settings page for org-level users (non-agency) including:
 * - Signal Usage & Billing (current bill, usage breakdown, projected costs)
 * - Payment Methods (saved cards, auto-pay setup)
 * - Members (invite users, manage roles)
 * - General Settings (org profile, preferences)
 * 
 * This replaces the need for a separate Team module for client orgs.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  CreditCard,
  Users,
  Building2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Info,
  PauseCircle,
  Shield,
  ArrowLeft,
  Pencil,
  Save,
  Loader2,
  X
} from 'lucide-react'
import SignalIcon from '@/components/ui/SignalIcon'
import SignalUsageBillingCard from '@/components/billing/SignalUsageBillingCard'
import OrganizationUsersPanel from './OrganizationUsersPanel'
import RolesPermissionsPanel from './RolesPermissionsPanel'
import useAuthStore from '@/lib/auth-store'
import { supabase } from '@/lib/supabase-auth'
import { adminApi } from '@/lib/portal-api'
import { toast } from 'sonner'
import { ModuleLayout } from '@/components/ModuleLayout'
import { MODULE_ICONS } from '@/lib/module-icons'
import { UptradeSpinner } from '@/components/UptradeLoading'

export default function OrgSettings() {
  const navigate = useNavigate()
  const { user, currentOrg, accessLevel, isSuperAdmin } = useAuthStore()
  const [activeTab, setActiveTab] = useState('billing')
  const [orgDetails, setOrgDetails] = useState(null)
  const [isLoadingOrg, setIsLoadingOrg] = useState(true)
  
  // Org rename state
  const [editingName, setEditingName] = useState(false)
  const [orgNameDraft, setOrgNameDraft] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)
  
  // Billing suspension modal state
  const [suspendModalOpen, setSuspendModalOpen] = useState(false)
  const [suspensionReason, setSuspensionReason] = useState('')
  const [isSuspending, setIsSuspending] = useState(false)

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
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="billing" className="gap-2">
              <SignalIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Signal Usage</span>
              <span className="sm:hidden">Usage</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payment</span>
              <span className="sm:hidden">Pay</span>
            </TabsTrigger>
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

          {/* Signal Usage & Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <div className="grid gap-6">
              {/* Current usage card */}
              <SignalUsageBillingCard />
              
              {/* Usage explanation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SignalIcon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                    About Signal Billing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-[var(--text-secondary)]">
                    Signal AI usage is billed monthly based on your actual usage. Invoices are generated 
                    at the beginning of each month and payment is due within 14 days.
                  </p>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-4 rounded-lg bg-[var(--surface-secondary)]">
                      <h4 className="font-medium mb-2">Token Usage</h4>
                      <p className="text-sm text-[var(--text-secondary)]">
                        AI conversations and document processing are charged per token.
                        Rates vary by model tier used.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--surface-secondary)]">
                      <h4 className="font-medium mb-2">Request Charges</h4>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Some advanced AI features incur a per-request charge 
                        for specialized processing.
                      </p>
                    </div>
                  </div>

                  {orgDetails?.auto_pay_enabled && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-green-700">
                        Auto-pay is enabled. Your bill will be charged automatically.
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payment Methods Tab - Placeholder until billing integration is wired */}
          <TabsContent value="payment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>
                  Billing and payment for Signal usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-[var(--text-tertiary)]" />
                  <h3 className="text-lg font-medium mb-2">Payment methods</h3>
                  <p className="text-[var(--text-secondary)] max-w-md mx-auto">
                    Payment methods and invoices are managed by your account manager. Contact them to add a card or update billing.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
            {/* Billing Suspension - Sonor Agency Only (clients cannot suspend their own billing) */}
            {isSuperAdmin && (
              <Card className="border-amber-500/30 bg-amber-500/5 dark:bg-amber-900/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <PauseCircle className="h-5 w-5" />
                    Billing Suspension (Admin Only)
                  </CardTitle>
                  <CardDescription className="text-amber-600/80 dark:text-amber-500/80">
                    Temporarily suspend Signal billing for project setup or troubleshooting
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-amber-500/20 bg-card">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">Billing Status</h4>
                        {orgDetails?.billing_suspended ? (
                          <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                            <PauseCircle className="h-3 w-3 mr-1" />
                            Suspended
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {orgDetails?.billing_suspended 
                          ? 'Signal AI remains enabled, but usage is not being tracked or billed.'
                          : 'Signal AI usage is being tracked and billed normally.'}
                      </p>
                      {orgDetails?.billing_suspended_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Suspended on {new Date(orgDetails.billing_suspended_at).toLocaleDateString()}
                        </p>
                      )}
                      {orgDetails?.billing_suspension_reason && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                          Reason: {orgDetails.billing_suspension_reason}
                        </p>
                      )}
                    </div>
                    <Button
                      variant={orgDetails?.billing_suspended ? 'default' : 'outline'}
                      disabled={isSuspending}
                      onClick={async () => {
                        if (orgDetails?.billing_suspended) {
                          // Resume billing
                          setIsSuspending(true)
                          try {
                            const { error } = await supabase
                              .from('organizations')
                              .update({ 
                                billing_suspended: false,
                                billing_suspended_at: null,
                                billing_suspension_reason: null,
                                billing_suspended_by: null
                              })
                              .eq('id', currentOrg.id)
                            
                            if (error) throw error
                            
                            setOrgDetails(prev => ({
                              ...prev,
                              billing_suspended: false,
                              billing_suspended_at: null,
                              billing_suspension_reason: null,
                              billing_suspended_by: null
                            }))
                            
                            toast.success('Billing resumed - Signal AI usage tracking and billing restored')
                          } catch (err) {
                            console.error('Failed to resume billing:', err)
                            toast.error('Failed to resume billing')
                          } finally {
                            setIsSuspending(false)
                          }
                        } else {
                          // Open suspension modal
                          setSuspensionReason('')
                          setSuspendModalOpen(true)
                        }
                      }}
                    >
                      {isSuspending && <UptradeSpinner className="h-4 w-4 mr-2" />}
                      {orgDetails?.billing_suspended ? 'Resume Billing' : 'Suspend Billing'}
                    </Button>
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Info className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div className="text-sm text-amber-700 dark:text-amber-300">
                      <p><strong>Use Case:</strong> Suspend billing when setting up a new project to use Signal for configuration without incurring charges.</p>
                      <p className="mt-2"><strong>Effect:</strong> Signal AI remains fully functional, but usage is not tracked or billed. Use this for testing, setup, or troubleshooting.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Billing Suspension Confirmation Modal */}
            <Dialog open={suspendModalOpen} onOpenChange={setSuspendModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <PauseCircle className="h-5 w-5 text-amber-500" />
                    Suspend Signal Billing
                  </DialogTitle>
                  <DialogDescription>
                    Signal AI will remain enabled for <strong>{currentOrg?.name}</strong>, but usage will not be tracked or billed until billing is resumed.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="suspension-reason">Reason for Suspension</Label>
                    <Textarea
                      id="suspension-reason"
                      placeholder="e.g., Project setup in progress, Troubleshooting billing issue..."
                      value={suspensionReason}
                      onChange={(e) => setSuspensionReason(e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      This will be visible to other admins reviewing billing history.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      <strong>Note:</strong> Signal AI features remain fully functional during suspension. Only billing/usage tracking is paused. This is useful for testing and setup without incurring costs.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSuspendModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    disabled={!suspensionReason.trim() || isSuspending}
                    onClick={async () => {
                      setIsSuspending(true)
                      try {
                        const { error } = await supabase
                          .from('organizations')
                          .update({ 
                            billing_suspended: true,
                            billing_suspended_at: new Date().toISOString(),
                            billing_suspension_reason: suspensionReason.trim(),
                            billing_suspended_by: user.id
                          })
                          .eq('id', currentOrg.id)
                        
                        if (error) throw error
                        
                        setOrgDetails(prev => ({
                          ...prev,
                          billing_suspended: true,
                          billing_suspended_at: new Date().toISOString(),
                          billing_suspension_reason: suspensionReason.trim(),
                          billing_suspended_by: user.id
                        }))
                        
                        toast.success('Billing suspended - Signal AI usage is no longer being tracked or billed')
                        setSuspendModalOpen(false)
                      } catch (err) {
                        console.error('Failed to suspend billing:', err)
                        toast.error('Failed to suspend billing')
                      } finally {
                        setIsSuspending(false)
                      }
                    }}
                  >
                    {isSuspending && <UptradeSpinner className="h-4 w-4 mr-2" />}
                    Suspend Billing
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Signal AI Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SignalIcon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                  Signal AI
                </CardTitle>
                <CardDescription>
                  Enable or disable Signal AI for this organization to control costs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">Signal AI Access</h4>
                      {orgDetails?.signal_enabled && (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Enabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      When enabled, all projects in this organization can use Signal AI features.
                      Disabling will prevent AI usage and stop incurring charges.
                    </p>
                    {orgDetails?.signal_enabled_at && (
                      <p className="text-xs text-[var(--text-tertiary)] mt-2">
                        Enabled since {new Date(orgDetails.signal_enabled_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button
                    variant={orgDetails?.signal_enabled ? 'destructive' : 'default'}
                    onClick={async () => {
                      try {
                        const newValue = !orgDetails?.signal_enabled
                        const { error } = await supabase
                          .from('organizations')
                          .update({ 
                            signal_enabled: newValue,
                            signal_enabled_at: newValue ? new Date().toISOString() : null
                          })
                          .eq('id', currentOrg.id)
                        
                        if (error) throw error
                        
                        setOrgDetails(prev => ({
                          ...prev,
                          signal_enabled: newValue,
                          signal_enabled_at: newValue ? new Date().toISOString() : null
                        }))
                        
                        toast.success(newValue ? 'Signal AI enabled' : 'Signal AI disabled')
                      } catch (err) {
                        console.error('Failed to toggle Signal:', err)
                        toast.error('Failed to update Signal setting')
                      }
                    }}
                  >
                    {orgDetails?.signal_enabled ? 'Disable Signal' : 'Enable Signal'}
                  </Button>
                </div>

                {orgDetails?.signal_tier && orgDetails.signal_tier !== 'none' && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--surface-secondary)]">
                    <Info className="h-4 w-4 mt-0.5 text-[var(--text-secondary)]" />
                    <div className="text-sm text-[var(--text-secondary)]">
                      <p><strong>Current tier:</strong> {orgDetails.signal_tier}</p>
                      <p className="mt-1">
                        {orgDetails.signal_tier === 'org' 
                          ? 'Organization-wide Signal access is enabled for all projects.'
                          : 'Signal is enabled per-project basis.'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-600" />
                  <div className="text-sm text-yellow-700">
                    <p><strong>Cost Control:</strong> Disabling Signal will stop all AI features and prevent new charges. Existing usage will still appear on your next invoice.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
  )
}
