/**
 * TeamTab - Glass-styled team management for CRM
 * Features: Team member list, role management, invite flow, metrics
 */
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Users,
  UserPlus,
  Shield,
  Crown,
  Briefcase,
  Mail,
  Phone,
  MoreHorizontal,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  Edit2,
  Loader2,
  TrendingUp,
  FileText,
  Target
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GlassCard, GlassAvatar, GlassEmptyState, StatusBadge } from './ui'
import { toast } from '@/lib/toast'
import { useTeamMembers, useCreateTeamMember, useUpdateTeamMember, useDeleteTeamMember, useResendInvite, useSetTeamMemberStatus, teamKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import useAuthStore from '@/lib/auth-store'

// Role icons and colors
const ROLE_CONFIG = {
  admin: { 
    icon: Crown, 
    label: 'Admin', 
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    borderColor: 'border-amber-400/30'
  },
  manager: { 
    icon: Shield, 
    label: 'Manager', 
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    borderColor: 'border-purple-400/30'
  },
  sales_rep: { 
    icon: Briefcase, 
    label: 'Sales Rep', 
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/30'
  }
}

const STATUS_CONFIG = {
  active: { label: 'Active', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  inactive: { label: 'Inactive', variant: 'default' }
}

// Team Member Row Component
function TeamMemberRow({ member, currentUserId, onEdit, onResendInvite, onStatusChange }) {
  const roleConfig = ROLE_CONFIG[member.teamRole] || ROLE_CONFIG.sales_rep
  const statusConfig = STATUS_CONFIG[member.teamStatus] || STATUS_CONFIG.pending
  const RoleIcon = roleConfig.icon
  const isCurrentUser = member.id === currentUserId

  return (
    <GlassCard padding="md" hover className="group">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <GlassAvatar
          name={member.name}
          src={member.avatar}
          size="lg"
          gradient={member.teamStatus === 'active' ? 'brand' : 'orange'}
          status={member.teamStatus === 'active' ? 'online' : undefined}
        />
        
        {/* Member Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-[var(--text-primary)]">{member.name}</p>
            {isCurrentUser && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]">
                You
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-tertiary)]">{member.email}</p>
          
          {/* Integration info */}
          <div className="flex items-center gap-3 mt-1">
            {member.openphoneNumber && (
              <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {member.openphoneNumber}
              </span>
            )}
            {member.gmailAddress && (
              <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {member.gmailAddress}
              </span>
            )}
          </div>
        </div>
        
        {/* Metrics */}
        {member.metrics && (
          <div className="hidden lg:flex items-center gap-4 text-center">
            <div>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{member.metrics.clientsAssigned}</p>
              <p className="text-xs text-[var(--text-tertiary)]">Prospects</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{member.metrics.auditsCreated}</p>
              <p className="text-xs text-[var(--text-tertiary)]">Audits</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{member.metrics.proposalsCreated}</p>
              <p className="text-xs text-[var(--text-tertiary)]">Proposals</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--brand-primary)]">{member.metrics.conversionRate}%</p>
              <p className="text-xs text-[var(--text-tertiary)]">Conv.</p>
            </div>
          </div>
        )}
        
        {/* Role & Status Badges */}
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium",
            roleConfig.bgColor, roleConfig.color, "border", roleConfig.borderColor
          )}>
            <RoleIcon className="h-3.5 w-3.5" />
            {roleConfig.label}
          </div>
          <StatusBadge 
            status={statusConfig.label} 
            variant={statusConfig.variant} 
            size="sm" 
          />
        </div>
        
        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onEdit?.(member)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Details
            </DropdownMenuItem>
            {member.teamStatus === 'pending' && (
              <DropdownMenuItem onClick={() => onResendInvite?.(member)}>
                <Send className="h-4 w-4 mr-2" />
                Resend Invite
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {member.teamStatus === 'active' && !isCurrentUser && (
              <DropdownMenuItem 
                className="text-amber-500"
                onClick={() => onStatusChange?.(member, 'inactive')}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Deactivate
              </DropdownMenuItem>
            )}
            {member.teamStatus === 'inactive' && (
              <DropdownMenuItem 
                className="text-green-500"
                onClick={() => onStatusChange?.(member, 'active')}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Reactivate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </GlassCard>
  )
}

// Add Team Member Dialog
function AddTeamMemberDialog({ open, onOpenChange, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    teamRole: 'sales_rep',
    openphoneNumber: '',
    gmailAddress: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        email: '',
        name: '',
        teamRole: 'sales_rep',
        openphoneNumber: '',
        gmailAddress: ''
      })
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[var(--brand-primary)]" />
            Add Team Member
          </DialogTitle>
          <DialogDescription>
            Invite a new team member. They'll receive an email to set up their account.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@sonor.io"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.teamRole}
              onValueChange={(value) => handleChange('teamRole', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales_rep">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-400" />
                    Sales Rep
                  </div>
                </SelectItem>
                <SelectItem value="manager">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-400" />
                    Manager
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-400" />
                    Admin
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="openphone">OpenPhone Number</Label>
              <Input
                id="openphone"
                placeholder="+1 (555) 123-4567"
                value={formData.openphoneNumber}
                onChange={(e) => handleChange('openphoneNumber', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gmail">Gmail Address</Label>
              <Input
                id="gmail"
                type="email"
                placeholder="john@gmail.com"
                value={formData.gmailAddress}
                onChange={(e) => handleChange('gmailAddress', e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Invite...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Edit Team Member Dialog
function EditTeamMemberDialog({ open, onOpenChange, member, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    name: '',
    teamRole: 'sales_rep',
    openphoneNumber: '',
    gmailAddress: ''
  })

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || '',
        teamRole: member.teamRole || 'sales_rep',
        openphoneNumber: member.openphoneNumber || '',
        gmailAddress: member.gmailAddress || ''
      })
    }
  }, [member])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ id: member.id, ...formData })
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-[var(--brand-primary)]" />
            Edit Team Member
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Full Name</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-role">Role</Label>
            <Select
              value={formData.teamRole}
              onValueChange={(value) => handleChange('teamRole', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales_rep">Sales Rep</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-openphone">OpenPhone Number</Label>
              <Input
                id="edit-openphone"
                value={formData.openphoneNumber}
                onChange={(e) => handleChange('openphoneNumber', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-gmail">Gmail Address</Label>
              <Input
                id="edit-gmail"
                type="email"
                value={formData.gmailAddress}
                onChange={(e) => handleChange('gmailAddress', e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Main TeamTab Component
export default function TeamTab() {
  const { user } = useAuthStore()
  
  // React Query hooks
  const { data: teamData, isLoading } = useTeamMembers()
  const createTeamMemberMutation = useCreateTeamMember()
  const updateTeamMemberMutation = useUpdateTeamMember()
  const resendInviteMutation = useResendInvite()
  const setStatusMutation = useSetTeamMemberStatus()
  
  const teamMembers = teamData?.members || []
  const summary = teamData?.summary || null
  
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Handle add team member
  const handleAddMember = async (data) => {
    setIsSubmitting(true)
    try {
      await createTeamMemberMutation.mutateAsync(data)
      toast.success('Team member invited successfully')
      setShowAddDialog(false)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to invite team member')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle edit team member
  const handleEditMember = async (data) => {
    setIsSubmitting(true)
    try {
      await updateTeamMemberMutation.mutateAsync({ id: data.id, updates: data })
      toast.success('Team member updated')
      setEditingMember(null)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update team member')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle resend invite
  const handleResendInvite = async (member) => {
    try {
      await resendInviteMutation.mutateAsync(member.id)
      toast.success(`Invite resent to ${member.email}`)
    } catch (error) {
      toast.error('Failed to resend invite')
    }
  }

  // Handle status change
  const handleStatusChange = async (member, newStatus) => {
    try {
      await setStatusMutation.mutateAsync({ id: member.id, status: newStatus })
      toast.success(`${member.name} ${newStatus === 'active' ? 'reactivated' : 'deactivated'}`)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update status')
    }
  }

  // Group members by status
  const activeMembers = teamMembers.filter(m => m.teamStatus === 'active')
  const pendingMembers = teamMembers.filter(m => m.teamStatus === 'pending')
  const inactiveMembers = teamMembers.filter(m => m.teamStatus === 'inactive')

  if (isLoading && teamMembers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Team Management</h2>
          <p className="text-sm text-[var(--text-tertiary)]">
            Manage your sales team and their access
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[var(--brand-primary)]/10">
                <Users className="h-5 w-5 text-[var(--brand-primary)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{summary.activeMembers}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Active Members</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{summary.totalAudits}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Total Audits</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10">
                <FileText className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{summary.totalProposals}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Total Proposals</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-500/10">
                <Target className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{summary.totalAccepted}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Deals Won</p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Active Members */}
      {activeMembers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            Active Team ({activeMembers.length})
          </h3>
          <div className="space-y-2">
            {activeMembers.map(member => (
              <TeamMemberRow
                key={member.id}
                member={member}
                currentUserId={user?.id}
                onEdit={setEditingMember}
                onResendInvite={handleResendInvite}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pending Invites */}
      {pendingMembers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" />
            Pending Invites ({pendingMembers.length})
          </h3>
          <div className="space-y-2">
            {pendingMembers.map(member => (
              <TeamMemberRow
                key={member.id}
                member={member}
                currentUserId={user?.id}
                onEdit={setEditingMember}
                onResendInvite={handleResendInvite}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Members */}
      {inactiveMembers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
            <XCircle className="h-4 w-4 text-gray-400" />
            Inactive ({inactiveMembers.length})
          </h3>
          <div className="space-y-2 opacity-60">
            {inactiveMembers.map(member => (
              <TeamMemberRow
                key={member.id}
                member={member}
                currentUserId={user?.id}
                onEdit={setEditingMember}
                onResendInvite={handleResendInvite}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {teamMembers.length === 0 && (
        <GlassEmptyState
          icon={Users}
          title="No team members yet"
          description="Add your first team member to start building your sales team."
          action={
            <Button onClick={() => setShowAddDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          }
        />
      )}

      {/* Dialogs */}
      <AddTeamMemberDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={handleAddMember}
        isLoading={isSubmitting}
      />

      <EditTeamMemberDialog
        open={!!editingMember}
        onOpenChange={(open) => !open && setEditingMember(null)}
        member={editingMember}
        onSubmit={handleEditMember}
        isLoading={isSubmitting}
      />
    </div>
  )
}
