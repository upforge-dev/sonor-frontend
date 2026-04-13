/**
 * QuickSendDialog — lightweight "Send Now" modal for email templates.
 * Lets a user fire off a template to one or more addresses without
 * creating a full campaign.
 *
 * Resolution order:
 *   1. Fetch the project's email_settings (Resend domain, from name/email, reply-to)
 *   2. POST /email/gmail/send with fromEmail from settings
 *      → API tries Gmail first (if connected), falls back to Resend
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
import { Send, Loader2, Plus, X, Mail, AlertCircle } from 'lucide-react'
import { emailApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'
import { toast } from 'sonner'

export function QuickSendDialog({ template, open, onOpenChange }) {
  const { user, currentProject } = useAuthStore()

  const [recipients, setRecipients] = useState([''])
  const [subject, setSubject] = useState('')
  const [sending, setSending] = useState(false)
  const [emailSettings, setEmailSettings] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(false)

  // Fetch project email settings when dialog opens
  useEffect(() => {
    if (!open) return
    setSettingsLoading(true)
    emailApi.getSettings()
      .then((res) => setEmailSettings(res.data))
      .catch((err) => {
        console.warn('[QuickSend] Could not load email settings:', err)
        setEmailSettings(null)
      })
      .finally(() => setSettingsLoading(false))
  }, [open])

  // Reset form when template changes
  useEffect(() => {
    if (template && open) {
      setSubject(template.subject || '')
      setRecipients([''])
      setSending(false)
    }
  }, [template, open])

  const fromName = emailSettings?.default_from_name || ''
  const fromEmail = emailSettings?.default_from_email || ''
  const replyTo = emailSettings?.default_reply_to || ''
  const hasEmailConfig = !!fromEmail

  const validEmails = recipients.filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()))
  const canSend = validEmails.length > 0 && subject.trim() && hasEmailConfig && !settingsLoading

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
      const results = await Promise.allSettled(
        validEmails.map((email) =>
          emailApi.sendGmail({
            to: email.trim(),
            subject: subject.trim(),
            content: template.html,
            projectId: currentProject?.id,
            fromEmail,
            replyTo: replyTo || fromEmail,
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
          {/* Sender info from settings */}
          {settingsLoading ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading email settings...
            </div>
          ) : hasEmailConfig ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs">
              <Mail className="h-3.5 w-3.5 text-[var(--text-tertiary)] shrink-0" />
              <span className="text-[var(--text-secondary)]">
                From: <span className="text-[var(--text-primary)] font-medium">{fromName}</span>
                {' '}&lt;{fromEmail}&gt;
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              No email sender configured. Set up a from address in Email Settings first.
            </div>
          )}

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
