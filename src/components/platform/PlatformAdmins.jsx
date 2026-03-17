import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ShieldCheck, Plus, Trash2, Loader2, UserPlus } from 'lucide-react'
import { usePlatformAdmins, useAddPlatformAdmin, useRemovePlatformAdmin } from '@/lib/hooks/use-platform'
import { EmptyState } from '@/components/EmptyState'

export default function PlatformAdmins() {
  const { data, isLoading } = usePlatformAdmins()
  const addAdmin = useAddPlatformAdmin()
  const removeAdmin = useRemovePlatformAdmin()

  const [showAdd, setShowAdd] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('platform_admin')
  const [removingId, setRemovingId] = useState(null)

  const admins = data?.admins || data || []

  const handleAdd = () => {
    if (!newEmail.trim()) return
    addAdmin.mutate(
      { email: newEmail.trim(), role: newRole },
      {
        onSuccess: () => {
          setNewEmail('')
          setNewRole('platform_admin')
          setShowAdd(false)
        },
      }
    )
  }

  const handleRemove = (adminId) => {
    setRemovingId(adminId)
    removeAdmin.mutate(adminId, {
      onSettled: () => setRemovingId(null),
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          {admins.length} platform admin{admins.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Admin
        </Button>
      </div>

      {/* Add Admin Form */}
      {showAdd && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="flex-1"
                type="email"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform_admin">Platform Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Button onClick={handleAdd} disabled={!newEmail.trim() || addAdmin.isPending}>
                  {addAdmin.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-1" />
                  )}
                  Add
                </Button>
                <Button variant="ghost" onClick={() => { setShowAdd(false); setNewEmail('') }}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admins List */}
      {admins.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No platform admins"
          description="Add platform administrators to manage the SaaS platform."
          actionLabel="Add Admin"
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-[var(--glass-border)]">
              {admins.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between p-4 hover:bg-[var(--glass-bg)]">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-9 w-9 rounded-full bg-[var(--brand-primary)]/10 shrink-0">
                      <ShieldCheck className="h-4 w-4 text-[var(--brand-primary)]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {admin.name || `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || admin.email}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">{admin.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {(admin.platform_role || admin.role || 'admin').replace('_', ' ')}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[var(--text-secondary)] hover:text-red-500"
                      onClick={() => handleRemove(admin.id)}
                      disabled={removingId === admin.id}
                    >
                      {removingId === admin.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
