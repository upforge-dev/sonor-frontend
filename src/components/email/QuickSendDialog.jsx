/**
 * QuickSendDialog — lightweight "Send Now" modal for email templates.
 * Lets a user fire off a template to one or more addresses without
 * creating a full campaign. Uses POST /email/gmail/send under the hood
 * (Resend if the project has a domain, platform default otherwise).
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Send, Loader2, Plus, X, Mail } from 'lucide-react'
import { emailApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'
import { toast } from 'sonner'

export function QuickSendDialog({ template, open, onOpenChange }) {
  const { user, currentProject } = useAuthStore()

  const [recipients, setRecipients] = useState([''])
  const [subject, setSubject] = useState('')
  const [sending, setSending] = useState(false)

  // Reset form when template changes
  useEffect(() => {
    if (template && open) {
      setSubject(template.subject || '')
      setRecipients([''])
      setSending(false)
    }
  }, [template, open])

  const validEmails = recipients.filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()))
  const canSend = validEmails.length > 0 && subject.trim()

  function addRecipient() {
    setRecipients((prev) => [...prev, ''])
  }

  function removeRecipient(index) {
    setRecipients((prev) => prev.filter((_, i) => i !== index))
  }

  function updateRecipient(index, value) {
    setRecipients((prev) => prev.map((r, i) => (i === index ? value : r)))
  }

  async function handleSend() {
    if (!canSend) return
    setSending(true)

    try {
      // Send to each recipient
      const results = await Promise.allSettled(
        validEmails.map((email) =>
          emailApi.sendGmail({
            to: email.trim(),
            subject: subject.trim(),
            content: template.html,
            projectId: currentProject?.id,
            fromEmail: user?.email,
            includeSignature: true,
          })
        )
      )

      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.filter((r) => r.status === 'rejected').length

      if (failed === 0) {
        toast.success(`Sent to ${succeeded} recipient${succeeded > 1 ? 's' : ''}`)
      } else if (succeeded > 0) {
        toast.warning(`Sent to ${succeeded}, failed ${failed}`)
      } else {
        throw results[0].reason || new Error('Send failed')
      }

      onOpenChange(false)
    } catch (err) {
      console.error('[QuickSend] Error:', err)
      toast.error(err?.response?.data?.message || err.message || 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  if (!template) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-[var(--glass-bg-elevated)] backdrop-blur-[var(--blur-xl)] border-[var(--glass-border)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--text-primary)]">
            <div className="p-2 rounded-lg bg-[var(--brand-primary)]/10">
              <Mail className="h-4 w-4 text-[var(--brand-primary)]" />
            </div>
            Quick Send
          </DialogTitle>
          <DialogDescription className="text-[var(--text-secondary)]">
            Send "{template.name}" directly — no campaign needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Recipients */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[var(--text-secondary)]">To</Label>
            {recipients.map((email, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  value={email}
                  onChange={(e) => updateRecipient(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (i === recipients.length - 1) addRecipient()
                    }
                  }}
                  autoFocus={i === 0}
                />
                {recipients.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-[var(--text-tertiary)] hover:text-red-500"
                    onClick={() => removeRecipient(i)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]"
              onClick={addRecipient}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add recipient
            </Button>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[var(--text-secondary)]">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
            />
          </div>

          {/* Preview snippet */}
          <div className="rounded-lg border border-[var(--glass-border)] overflow-hidden">
            <div className="px-3 py-1.5 bg-[var(--glass-bg)] text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              Template Preview
            </div>
            <div className="h-28 overflow-hidden bg-white relative">
              <div className="absolute inset-0 origin-top-left" style={{ width: '200%', height: '200%', transform: 'scale(0.5)' }}>
                <div dangerouslySetInnerHTML={{ __html: template.html }} />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!canSend || sending} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? 'Sending...' : `Send${validEmails.length > 1 ? ` (${validEmails.length})` : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
