/**
 * AssignContactDialog - Dialog for assigning contacts to team members
 * Used in ProspectDetailPanel and bulk assignment
 */
import { useState, useEffect } from 'react'
import { UserPlus, Users, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { Checkbox } from '@/components/ui/checkbox'
import { GlassAvatar } from './ui'
import { useTeamMembers } from '@/lib/hooks'

export default function AssignContactDialog({
  open,
  onOpenChange,
  contacts = [], // Array of contacts to assign (or single contact)
  currentAssignee = null,
  onAssign,
  isLoading = false
}) {
  const { data: teamData, refetch: refetchTeam } = useTeamMembers()
  const teamMembers = Array.isArray(teamData?.members) ? teamData.members : []
  const [selectedMemberId, setSelectedMemberId] = useState(null)
  const [sendNotification, setSendNotification] = useState(true)

  useEffect(() => {
    if (open && teamMembers.length === 0) {
      void refetchTeam()
    }
  }, [open, teamMembers.length, refetchTeam])

  // Set current assignee as default
  useEffect(() => {
    if (open && currentAssignee) {
      setSelectedMemberId(currentAssignee)
    } else if (open) {
      setSelectedMemberId(null)
    }
  }, [open, currentAssignee])

  const handleAssign = () => {
    onAssign?.(selectedMemberId, sendNotification)
  }

  // Get active team members only
  const activeMembers = teamMembers.filter(m => m.teamStatus === 'active')

  // Single or multiple contacts?
  const isBulk = Array.isArray(contacts) && contacts.length > 1
  const contactCount = Array.isArray(contacts) ? contacts.length : 1
  const contactName = !isBulk && contacts[0]?.name ? contacts[0].name : 'contact'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[var(--brand-primary)]" />
            {isBulk ? `Assign ${contactCount} Contacts` : `Assign ${contactName}`}
          </DialogTitle>
          <DialogDescription>
            {isBulk 
              ? `Select a team member to assign ${contactCount} contacts to.`
              : 'Select a team member to assign this contact to.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Team Member Select */}
          <div className="space-y-2">
            <Label htmlFor="team-member">Team Member</Label>
            {activeMembers.length === 0 ? (
              <div className="text-sm text-[var(--text-tertiary)] p-4 text-center border border-dashed border-[var(--glass-border)] rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No active team members available
              </div>
            ) : (
              <Select
                value={selectedMemberId || 'unassigned'}
                onValueChange={(value) => setSelectedMemberId(value === 'unassigned' ? null : value)}
              >
                <SelectTrigger id="team-member">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-500/20" />
                      <span>Unassigned</span>
                    </div>
                  </SelectItem>
                  {activeMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <GlassAvatar
                          name={member.name}
                          src={member.avatar}
                          size="xs"
                          gradient="brand"
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{member.name}</span>
                          <span className="text-xs text-[var(--text-tertiary)]">
                            {member.teamRole === 'admin' ? 'Admin' : 
                             member.teamRole === 'manager' ? 'Manager' : 'Sales Rep'}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Notification Toggle */}
          {selectedMemberId && (
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="notify"
                checked={sendNotification}
                onCheckedChange={setSendNotification}
              />
              <Label
                htmlFor="notify"
                className="text-sm font-normal cursor-pointer"
              >
                Send email notification to team member
              </Label>
            </div>
          )}

          {/* Current Assignment Info */}
          {!isBulk && currentAssignee && currentAssignee !== selectedMemberId && (
            <div className="text-xs text-[var(--text-tertiary)] p-3 bg-[var(--glass-bg-inset)] rounded-lg border border-[var(--glass-border)]">
              Currently assigned to: <span className="font-medium text-[var(--text-primary)]">
                {activeMembers.find(m => m.id === currentAssignee)?.name || 'Unknown'}
              </span>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleAssign}
            disabled={isLoading || activeMembers.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {selectedMemberId ? 'Assign' : 'Unassign'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
