/**
 * CreateClientOrg — Modal dialog for agencies to create a new client organization
 */
import React, { useState } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Building2, CheckCircle } from 'lucide-react'
import { useCreateClientOrg } from '@/lib/hooks/use-agencies'
import { toast } from 'sonner'
import useAuthStore from '@/lib/auth-store'

export default function CreateClientOrg({ open, onOpenChange }) {
  const createOrg = useCreateClientOrg()
  const { switchOrganization } = useAuthStore()
  const [createdOrg, setCreatedOrg] = useState(null)

  const [form, setForm] = useState({
    name: '',
    domain: '',
    adminEmail: '',
    adminName: '',
  })

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Organization name is required')
      return
    }

    try {
      const org = await createOrg.mutateAsync({
        name: form.name.trim(),
        domain: form.domain.trim() || undefined,
        adminEmail: form.adminEmail.trim() || undefined,
        adminName: form.adminName.trim() || undefined,
      })
      setCreatedOrg(org)
      toast.success(`Created ${org.name}`)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create client organization')
    }
  }

  const handleSwitchToClient = async () => {
    if (createdOrg?.id) {
      await switchOrganization(createdOrg.id)
    }
    onOpenChange(false)
  }

  const handleClose = () => {
    setCreatedOrg(null)
    setForm({ name: '', domain: '', adminEmail: '', adminName: '' })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {createdOrg ? 'Client Created' : 'New Client Organization'}
          </DialogTitle>
          <DialogDescription>
            {createdOrg
              ? `${createdOrg.name} has been created. You can now switch to it or stay here.`
              : 'Create a new client organization under your agency.'}
          </DialogDescription>
        </DialogHeader>

        {createdOrg ? (
          <div className="py-6 flex flex-col items-center gap-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <div className="text-center">
              <div className="font-semibold text-lg">{createdOrg.name}</div>
              {createdOrg.slug && (
                <div className="text-sm text-muted-foreground">{createdOrg.slug}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name *</Label>
              <Input
                id="org-name"
                placeholder="e.g. Joe's Pizza"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-domain">Domain</Label>
              <Input
                id="org-domain"
                placeholder="e.g. joespizza.com"
                value={form.domain}
                onChange={(e) => handleChange('domain', e.target.value)}
              />
            </div>

            <div className="border-t pt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Optionally invite a client admin who will have their own login.
              </p>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Client Admin Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="client@example.com"
                  value={form.adminEmail}
                  onChange={(e) => handleChange('adminEmail', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-name">Client Admin Name</Label>
                <Input
                  id="admin-name"
                  placeholder="Jane Smith"
                  value={form.adminName}
                  onChange={(e) => handleChange('adminName', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {createdOrg ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Stay Here
              </Button>
              <Button onClick={handleSwitchToClient}>
                Switch to {createdOrg.name}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createOrg.isPending || !form.name.trim()}
              >
                {createOrg.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create Client
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
