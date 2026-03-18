/**
 * OrganizationUsersPanel - Manage organization members
 * Displays list of org members with invite/remove capabilities
 */
import { useState, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  Users,
  UserPlus,
  Mail,
  MoreHorizontal,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  Loader2,
  Crown,
  Shield,
  Briefcase,
  Search,
  UserCheck,
  Building2,
  FolderOpen,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { toast } from '@/lib/toast'
import { useOrgMembers, useInviteOrgMember, useRemoveOrgMember, useResendOrgMemberInvite, useUpdateOrgMemberRole, useSeatInfo } from '@/lib/hooks'
import { adminApi } from '@/lib/portal-api'
import useAuthStore from '@/lib/auth-store'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Role icons and labels
const ROLE_CONFIG = {
  admin: { icon: Crown, label: 'Admin', color: 'text-amber-400' },
  manager: { icon: Shield, label: 'Manager', color: 'text-purple-400' },
  member: { icon: Briefcase, label: 'Member', color: 'text-blue-400' },
}

// Status badges
const STATUS_CONFIG = {
  active: { icon: CheckCircle2, label: 'Active', variant: 'success' },
  pending: { icon: Clock, label: 'Pending', variant: 'warning' },
  inactive: { icon: XCircle, label: 'Inactive', variant: 'secondary' },
}

export default function OrganizationUsersPanel({ 
  organizationId, 
  organizationName,
  canManage = false 
}) {
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showMemberDetails, setShowMemberDetails] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviteAccessLevel, setInviteAccessLevel] = useState('organization')
  const [inviteProjectIds, setInviteProjectIds] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // For adding existing users
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [addUserRole, setAddUserRole] = useState('member')
  const [addUserAccessLevel, setAddUserAccessLevel] = useState('organization')
  const [addUserProjectIds, setAddUserProjectIds] = useState([])
  const [activeTab, setActiveTab] = useState('invite')
  
  // Get org projects from auth store
  const availableProjects = useAuthStore(s => s.availableProjects) || []

  // React Query hooks
  const { data: membersData, isLoading } = useOrgMembers(organizationId)
  const { data: seatInfo } = useSeatInfo(organizationId)
  const inviteMemberMutation = useInviteOrgMember()
  const removeMemberMutation = useRemoveOrgMember()
  const resendInviteMutation = useResendOrgMemberInvite()
  const updateRoleMutation = useUpdateOrgMemberRole()

  const members = membersData?.members || membersData || []
  
  const memberUserIds = useMemo(
    () => new Set(members.map(m => m.user_id || m.id)),
    [members]
  )

  // Search for existing users
  useEffect(() => {
    if (!userSearchQuery.trim() || activeTab !== 'existing') {
      setSearchResults([])
      return
    }

    const searchUsers = async () => {
      setIsSearching(true)
      try {
        const response = await adminApi.listUsers({ search: userSearchQuery, limit: 10 })
        const users = response.data?.users || response.data || []
        // Filter out users already in the org
        const filteredUsers = users.filter(u => !memberUserIds.has(u.id))
        setSearchResults(filteredUsers)
      } catch (error) {
        console.error('Error searching users:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    const debounce = setTimeout(searchUsers, 300)
    return () => clearTimeout(debounce)
  }, [userSearchQuery, memberUserIds, activeTab])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address')
      return
    }
    
    if (inviteAccessLevel === 'project' && inviteProjectIds.length === 0) {
      toast.error('Please select at least one project')
      return
    }
    
    setIsSubmitting(true)
    try {
      await inviteMemberMutation.mutateAsync({
        organizationId,
        email: inviteEmail.trim(),
        name: inviteName.trim() || inviteEmail.split('@')[0],
        role: inviteRole,
        accessLevel: inviteAccessLevel,
        projectIds: inviteAccessLevel === 'project' ? inviteProjectIds : [],
      })
      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      setInviteName('')
      setInviteRole('member')
      setInviteAccessLevel('organization')
      setInviteProjectIds([])
      setShowInviteDialog(false)
    } catch (error) {
      toast.error(error.message || 'Failed to send invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddExistingUser = async () => {
    if (!selectedUser) {
      toast.error('Please select a user')
      return
    }
    
    if (addUserAccessLevel === 'project' && addUserProjectIds.length === 0) {
      toast.error('Please select at least one project')
      return
    }

    setIsSubmitting(true)
    try {
      await adminApi.addOrgMember(organizationId, {
        user_id: selectedUser.id,
        role: addUserRole,
        accessLevel: addUserAccessLevel,
        projectIds: addUserAccessLevel === 'project' ? addUserProjectIds : [],
      })
      toast.success(`${selectedUser.email} added to organization`)
      setSelectedUser(null)
      setAddUserRole('member')
      setAddUserAccessLevel('organization')
      setAddUserProjectIds([])
      setUserSearchQuery('')
      setShowInviteDialog(false)
      // Refetch members
      inviteMemberMutation.reset()
    } catch (error) {
      toast.error(error.message || 'Failed to add user')
    } finally {
      setIsSubmitting(false)
    }
  }

  // API expects contact ID (member.contact.id), not the member row id
  const getContactId = (member) => member.contact?.id ?? member.id

  const handleRemove = async (member) => {
    const contactId = getContactId(member)
    if (!contactId) {
      toast.error('Cannot remove this member')
      return
    }
    try {
      await removeMemberMutation.mutateAsync({
        organizationId,
        contactId,
      })
      const contact = member.contact || member
      toast.success(`${contact.name || contact.email} removed from organization`)
    } catch (error) {
      toast.error(error.message || 'Failed to remove member')
    }
  }

  const handleRoleChange = async (member, newRole) => {
    const contactId = getContactId(member)
    if (!contactId) {
      toast.error('Cannot update role for this member')
      return
    }
    try {
      await updateRoleMutation.mutateAsync({
        organizationId,
        contactId,
        role: newRole,
      })
      const contact = member.contact || member
      toast.success(`${contact.name || contact.email} is now a ${newRole}`)
    } catch (error) {
      toast.error('Failed to update role')
    }
  }

  const handleResendInvite = async (member) => {
    const contactId = getContactId(member)
    if (!contactId) {
      toast.error('Cannot resend invite for this member')
      return
    }
    try {
      await resendInviteMutation.mutateAsync({
        organizationId,
        contactId,
      })
      const contact = member.contact || member
      toast.success(`Invitation resent to ${contact.email}`)
    } catch (error) {
      const msg = error.response?.data?.message
      const errMsg = Array.isArray(msg) ? msg[0] : (msg || error.message || 'Failed to resend invitation')
      toast.error(errMsg)
    }
  }

  const getInitials = (member) => {
    const contact = member.contact || member
    const name = contact.name || contact.full_name || contact.email || ''
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const handleMemberClick = (member) => {
    setSelectedMember(member)
    setShowMemberDetails(true)
  }

  if (isLoading) {
    return (
      <Card className="border-[var(--glass-border)] bg-[var(--glass-bg)]">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card data-sonor-help="settings/team" className="border-[var(--glass-border)] bg-[var(--glass-bg)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Organization Members
            </CardTitle>
            <CardDescription>
              {members.length} member{members.length !== 1 ? 's' : ''} in {organizationName || 'this organization'}
              {seatInfo && (
                <span className="ml-2 text-[var(--text-tertiary)]">
                  ({seatInfo.current} of {seatInfo.included} seats used)
                </span>
              )}
            </CardDescription>
          </div>
          {canManage && (
            <Button onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          )}
        </CardHeader>

        {/* Seat limit warning */}
        {seatInfo && !seatInfo.billingExempt && seatInfo.current >= seatInfo.included && (
          <div className={cn(
            'mx-6 mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2',
            seatInfo.current > seatInfo.included
              ? 'bg-[var(--accent-amber)]/10 border border-[var(--accent-amber)]/20 text-[var(--accent-amber)]'
              : 'bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/20 text-[var(--accent-blue)]'
          )}>
            <Info className="h-4 w-4 shrink-0" />
            {seatInfo.current > seatInfo.included ? (
              <span>
                You're using <strong>{seatInfo.current - seatInfo.included} extra seat{seatInfo.current - seatInfo.included !== 1 ? 's' : ''}</strong> beyond your plan's {seatInfo.included} included.
                {' '}Each additional seat costs <strong>${(seatInfo.overagePrice / 100).toFixed(0)}/mo</strong>.
              </span>
            ) : (
              <span>
                All <strong>{seatInfo.included}</strong> seats in your plan are in use. Adding more members will incur an additional <strong>${(seatInfo.overagePrice / 100).toFixed(0)}/mo per seat</strong>.
              </span>
            )}
          </div>
        )}

        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-tertiary)]">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No members found</p>
              {canManage && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowInviteDialog(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite your first member
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => {
                const contact = member.contact || member
                const role = member.role || member.org_role || 'member'
                const status = member.status || member.invite_status || (contact.auth_user_id ? 'active' : 'pending')
                const RoleIcon = ROLE_CONFIG[role]?.icon || Briefcase
                const StatusIcon = STATUS_CONFIG[status]?.icon || CheckCircle2

                return (
                  <div
                    key={member.id || member.user_id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg',
                      'bg-[var(--surface-secondary)] border border-transparent',
                      'hover:border-[var(--glass-border)] hover:cursor-pointer transition-colors'
                    )}
                    onClick={() => handleMemberClick(member)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={contact.avatar || contact.avatar_url} />
                        <AvatarFallback className="bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                          {getInitials(member)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-[var(--text-primary)]">
                          {contact.name || contact.full_name || contact.email}
                        </span>
                        <span className="text-sm text-[var(--text-tertiary)]">
                          {contact.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <RoleIcon className={cn('h-4 w-4', ROLE_CONFIG[role]?.color)} />
                        <span className="text-sm text-[var(--text-secondary)]">
                          {ROLE_CONFIG[role]?.label || role}
                        </span>
                      </div>

                      {/* Access Level Badge */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                'text-xs',
                                member.access_level === 'project' 
                                  ? 'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5' 
                                  : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
                              )}
                            >
                              {member.access_level === 'project' ? (
                                <><FolderOpen className="h-3 w-3 mr-1" /> Project</>
                              ) : (
                                <><Building2 className="h-3 w-3 mr-1" /> Org</>
                              )}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {member.access_level === 'project' 
                              ? 'Project-level access only — cannot see billing or org settings' 
                              : 'Full organization access'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <Badge variant={STATUS_CONFIG[status]?.variant || 'secondary'}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {STATUS_CONFIG[status]?.label || status}
                      </Badge>

                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRoleChange(member, 'admin'); }}>
                              <Crown className="h-4 w-4 mr-2 text-amber-400" />
                              Make Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRoleChange(member, 'manager'); }}>
                              <Shield className="h-4 w-4 mr-2 text-purple-400" />
                              Make Manager
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRoleChange(member, 'member'); }}>
                              <Briefcase className="h-4 w-4 mr-2 text-blue-400" />
                              Make Member
                            </DropdownMenuItem>
                            {status === 'pending' && contact?.id && (
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); handleResendInvite(member); }}
                                disabled={resendInviteMutation.isPending}
                              >
                                {resendInviteMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4 mr-2" />
                                )}
                                Resend invitation
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={(e) => { e.stopPropagation(); handleRemove(member); }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove from Org
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite/Add Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Invite a new user or add an existing user to {organizationName || 'your organization'}. You can restrict access to specific projects only.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="invite">
                <Mail className="h-4 w-4 mr-2" />
                Invite New
              </TabsTrigger>
              <TabsTrigger value="existing">
                <UserCheck className="h-4 w-4 mr-2" />
                Add Existing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="invite" className="space-y-4 py-4">
              {/* Access Level first - key for project-scoped invites */}
              <div className="space-y-2">
                <Label htmlFor="invite-access">Access Level</Label>
                <Select value={inviteAccessLevel} onValueChange={(v) => { setInviteAccessLevel(v); if (v === 'organization') setInviteProjectIds([]); }}>
                  <SelectTrigger id="invite-access">
                    <SelectValue placeholder="Select access level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="organization">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-emerald-500" />
                        Organization — Full access to all projects
                      </div>
                    </SelectItem>
                    <SelectItem value="project">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-blue-500" />
                        Project Only — Access to selected projects only
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {inviteAccessLevel === 'project'
                    ? 'User will only see their assigned projects — no billing, proposals, or org settings'
                    : 'User will have access to all projects, billing, and org settings'}
                </p>
              </div>

              {inviteAccessLevel === 'project' && availableProjects.length > 0 && (
                <div className="space-y-2">
                  <Label>Assign to Projects</Label>
                  <div className="border border-[var(--glass-border)] rounded-lg max-h-[160px] overflow-y-auto">
                    {availableProjects.map((project) => (
                      <label
                        key={project.id}
                        className="flex items-center gap-3 p-2.5 hover:bg-[var(--glass-bg-hover)] cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-[var(--input-border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                          checked={inviteProjectIds.includes(project.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setInviteProjectIds(prev => [...prev, project.id])
                            } else {
                              setInviteProjectIds(prev => prev.filter(id => id !== project.id))
                            }
                          }}
                        />
                        <span className="text-sm text-[var(--text-primary)]">{project.title || project.name}</span>
                      </label>
                    ))}
                  </div>
                  {inviteProjectIds.length > 0 && (
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {inviteProjectIds.length} project{inviteProjectIds.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              )}

              {inviteAccessLevel === 'project' && availableProjects.length === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                  No projects found for this organization. Refresh the page or switch to a project and back to load projects.
                </p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="invite-name">Name <span className="text-[var(--text-tertiary)] font-normal">(optional)</span></Label>
                  <Input
                    id="invite-name"
                    placeholder="John Doe"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger id="invite-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-400" />
                        Admin
                      </div>
                    </SelectItem>
                    <SelectItem value="manager">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-purple-400" />
                        Manager
                      </div>
                    </SelectItem>
                    <SelectItem value="member">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-blue-400" />
                        Member
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="existing" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="search-user">Search Users</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-user"
                    placeholder="Search by name or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                {/* Search Results */}
                {userSearchQuery && (
                  <div className="border rounded-md max-h-[200px] overflow-y-auto">
                    {isSearching ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                        Searching...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No users found
                      </div>
                    ) : (
                      <div className="divide-y">
                        {searchResults.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => setSelectedUser(user)}
                            className={cn(
                              'w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left',
                              selectedUser?.id === user.id && 'bg-muted'
                            )}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {(user.name || user.email || '?').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{user.name || user.email}</div>
                              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                            </div>
                            {selectedUser?.id === user.id && (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedUser && (
                <>
                <div className="space-y-2">
                  <Label htmlFor="add-role">Role</Label>
                  <Select value={addUserRole} onValueChange={setAddUserRole}>
                    <SelectTrigger id="add-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-amber-400" />
                          Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="manager">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-purple-400" />
                          Manager
                        </div>
                      </SelectItem>
                      <SelectItem value="member">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-blue-400" />
                          Member
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Access Level for existing user */}
                <div className="space-y-2">
                  <Label htmlFor="add-access">Access Level</Label>
                  <Select value={addUserAccessLevel} onValueChange={(v) => { setAddUserAccessLevel(v); if (v === 'organization') setAddUserProjectIds([]); }}>
                    <SelectTrigger id="add-access">
                      <SelectValue placeholder="Select access level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="organization">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-emerald-500" />
                          Organization — Full access
                        </div>
                      </SelectItem>
                      <SelectItem value="project">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-blue-500" />
                          Project Only — Limited access
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {addUserAccessLevel === 'project' 
                      ? 'User will only see assigned projects — no billing, proposals, or org settings' 
                      : 'User will have access to all projects, billing, and org settings'}
                  </p>
                </div>
                
                {/* Project Selector for existing user */}
                {addUserAccessLevel === 'project' && availableProjects.length > 0 && (
                  <div className="space-y-2">
                    <Label>Assign to Projects</Label>
                    <div className="border border-[var(--glass-border)] rounded-lg max-h-[160px] overflow-y-auto">
                      {availableProjects.map((project) => (
                        <label 
                          key={project.id} 
                          className="flex items-center gap-3 p-2.5 hover:bg-[var(--glass-bg-hover)] cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-[var(--input-border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                            checked={addUserProjectIds.includes(project.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAddUserProjectIds(prev => [...prev, project.id])
                              } else {
                                setAddUserProjectIds(prev => prev.filter(id => id !== project.id))
                              }
                            }}
                          />
                          <span className="text-sm text-[var(--text-primary)]">{project.title || project.name}</span>
                        </label>
                      ))}
                    </div>
                    {addUserProjectIds.length > 0 && (
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {addUserProjectIds.length} project{addUserProjectIds.length !== 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                )}
                </>
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            {activeTab === 'invite' ? (
              <Button onClick={handleInvite} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Invitation
              </Button>
            ) : (
              <Button onClick={handleAddExistingUser} disabled={isSubmitting || !selectedUser}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4 mr-2" />
                )}
                Add User
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Details Dialog */}
      <Dialog open={showMemberDetails} onOpenChange={setShowMemberDetails}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
          </DialogHeader>
          
          {selectedMember && (() => {
            const contact = selectedMember.contact || selectedMember
            const role = selectedMember.role || selectedMember.org_role || 'member'
            const status = selectedMember.status || selectedMember.invite_status || (contact.auth_user_id ? 'active' : 'pending')
            const RoleIcon = ROLE_CONFIG[role]?.icon || Briefcase
            const StatusIcon = STATUS_CONFIG[status]?.icon || CheckCircle2
            
            return (
              <div className="space-y-6 py-4">
                {/* Avatar and Name */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={contact.avatar || contact.avatar_url} />
                    <AvatarFallback className="bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xl">
                      {getInitials(selectedMember)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      {contact.name || contact.full_name || 'No name'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={STATUS_CONFIG[status]?.variant || 'secondary'}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {STATUS_CONFIG[status]?.label || status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-[var(--text-tertiary)] text-xs uppercase">Email</Label>
                    <div className="text-[var(--text-primary)]">{contact.email || 'Not provided'}</div>
                  </div>

                  {contact.phone && (
                    <div className="space-y-1">
                      <Label className="text-[var(--text-tertiary)] text-xs uppercase">Phone</Label>
                      <div className="text-[var(--text-primary)]">{contact.phone}</div>
                    </div>
                  )}

                  {contact.company && (
                    <div className="space-y-1">
                      <Label className="text-[var(--text-tertiary)] text-xs uppercase">Company</Label>
                      <div className="text-[var(--text-primary)]">{contact.company}</div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-[var(--text-tertiary)] text-xs uppercase">Role</Label>
                    <div className="flex items-center gap-2">
                      <RoleIcon className={cn('h-4 w-4', ROLE_CONFIG[role]?.color)} />
                      <span className="text-[var(--text-primary)]">{ROLE_CONFIG[role]?.label || role}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[var(--text-tertiary)] text-xs uppercase">Access Level</Label>
                    <div className="flex items-center gap-2">
                      {selectedMember.access_level === 'project' ? (
                        <>
                          <FolderOpen className="h-4 w-4 text-blue-500" />
                          <span className="text-[var(--text-primary)]">Project Only</span>
                        </>
                      ) : (
                        <>
                          <Building2 className="h-4 w-4 text-emerald-500" />
                          <span className="text-[var(--text-primary)]">Organization-wide</span>
                        </>
                      )}
                    </div>
                    {selectedMember.access_level === 'project' && (
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">
                        Cannot access billing, proposals, or org settings
                      </p>
                    )}
                  </div>

                  {contact.last_sign_in_at && (
                    <div className="space-y-1">
                      <Label className="text-[var(--text-tertiary)] text-xs uppercase">Last Sign In</Label>
                      <div className="text-[var(--text-primary)]">
                        {new Date(contact.last_sign_in_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-[var(--text-tertiary)] text-xs uppercase">Member Since</Label>
                    <div className="text-[var(--text-primary)]">
                      {new Date(selectedMember.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
          
          <DialogFooter>
            {selectedMember && (selectedMember.status || selectedMember.invite_status || (selectedMember.contact?.auth_user_id ? 'active' : 'pending')) === 'pending' && selectedMember.contact?.id && (
              <Button
                variant="outline"
                onClick={() => handleResendInvite(selectedMember)}
                disabled={resendInviteMutation.isPending}
              >
                {resendInviteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Resend invitation
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowMemberDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
