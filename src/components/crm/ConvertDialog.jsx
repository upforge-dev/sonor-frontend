/**
 * ConvertDialog - Glass-styled confirmation dialog for converting prospects to users
 * Features: Magic link option, glass styling, confirmation flow
 */
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Loader2, UserCheck, Mail, Sparkles, ArrowRight, Shield } from 'lucide-react'
import { GlassCard, GlassAvatar } from './ui'
import { crmApi } from '@/lib/sonor-api'
import { toast } from '@/lib/toast'

export default function ConvertDialog({ open, onOpenChange, prospect, onSuccess }) {
  const [sendMagicLink, setSendMagicLink] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConvert = async () => {
    if (!prospect) return
    
    setIsSubmitting(true)
    try {
      await crmApi.convertProspect(prospect.id, { sendMagicLink })
      
      if (sendMagicLink) {
        toast.success('Magic link sent! Prospect is now a portal user.')
      } else {
        toast.success('Prospect converted to portal user.')
      }
      
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      console.error('Failed to convert prospect:', err)
      toast.error(err.response?.data?.error || 'Failed to convert prospect')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!prospect) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md glass border-[var(--glass-border)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#4bbf39]/20 to-[#39bfb0]/20">
              <UserCheck className="h-5 w-5 text-[#4bbf39]" />
            </div>
            Convert to Portal User
          </DialogTitle>
          <DialogDescription>
            This prospect will gain access to the client portal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Prospect Preview */}
          <GlassCard className="p-4">
            <div className="flex items-center gap-4">
              <GlassAvatar
                name={prospect.name}
                src={prospect.avatar}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--text-primary)] truncate">
                  {prospect.name}
                </p>
                {prospect.company && (
                  <p className="text-sm text-[var(--text-secondary)] truncate">
                    {prospect.company}
                  </p>
                )}
                <p className="text-sm text-[var(--text-tertiary)] truncate">
                  {prospect.email || 'No email'}
                </p>
              </div>
            </div>
          </GlassCard>

          {/* What happens */}
          <GlassCard variant="inset" className="p-4 space-y-3">
            <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              What happens
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-[#4bbf39]/10">
                  <Shield className="h-4 w-4 text-[#4bbf39]" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-[var(--text-primary)]">Portal Access</p>
                  <p className="text-[var(--text-secondary)]">
                    User can view proposals, files, and messages
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-[#39bfb0]/10">
                  <Sparkles className="h-4 w-4 text-[#39bfb0]" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-[var(--text-primary)]">Pipeline Update</p>
                  <p className="text-[var(--text-secondary)]">
                    Stage automatically moves to "Contacted"
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Magic Link Option */}
          {prospect.email && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--glass-border)] bg-gradient-to-r from-[#4bbf39]/5 to-[#39bfb0]/5">
              <Checkbox
                id="sendMagicLink"
                checked={sendMagicLink}
                onCheckedChange={setSendMagicLink}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label 
                  htmlFor="sendMagicLink" 
                  className="font-medium text-[var(--text-primary)] cursor-pointer"
                >
                  Send magic link email
                </Label>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                  User receives an email with instant portal access (no password needed)
                </p>
              </div>
              <Mail className="h-5 w-5 text-[var(--text-tertiary)]" />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConvert}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#43ab33] hover:to-[#33aba0] text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                Convert User
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
