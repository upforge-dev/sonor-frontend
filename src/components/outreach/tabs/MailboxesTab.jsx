import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Plus,
  Mail,
  Lock,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  Pause,
  Play,
  Settings as SettingsIcon,
  Unplug,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSignalTier } from '@/hooks/useSignalTier'
import { outreachApi } from '@/lib/sonor-api'
import {
  OutreachLoading,
  OutreachEmptyState,
  OutreachStatusBadge,
} from '@/components/outreach/ui'
import MailboxEditor from './MailboxEditor'

/**
 * Opens a popup window for the Gmail OAuth flow and resolves when the backend
 * finalizes the connection (the popup closes and the parent sees an updated
 * mailbox list).
 */
function openOAuthPopup(authUrl) {
  return new Promise((resolve) => {
    const w = 560
    const h = 720
    const y = window.outerHeight / 2 + window.screenY - h / 2
    const x = window.outerWidth / 2 + window.screenX - w / 2
    const popup = window.open(
      authUrl,
      'sonor-mailbox-oauth',
      `width=${w},height=${h},left=${x},top=${y}`,
    )

    // The callback endpoint redirects back to the redirectUri we passed in
    // (the parent origin), where a small handler posts `oauth=success|error`
    // to us via window.opener and closes. If the popup closes before that,
    // we still resolve so the parent can refresh.
    const interval = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(interval)
        window.removeEventListener('message', onMessage)
        resolve({ closed: true })
      }
    }, 500)

    const onMessage = (evt) => {
      if (evt?.data?.type === 'sonor-mailbox-oauth') {
        clearInterval(interval)
        window.removeEventListener('message', onMessage)
        try {
          popup?.close()
        } catch {}
        resolve(evt.data.payload || { closed: false })
      }
    }
    window.addEventListener('message', onMessage)
  })
}

function maskEmail(email) {
  if (!email) return ''
  const [user, domain] = email.split('@')
  if (!domain) return email
  if (user.length <= 2) return `${user}@${domain}`
  return `${user.slice(0, 2)}***@${domain}`
}

function formatLocal(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function MailboxesTab() {
  const { hasFullSignal, upgradeLabel, upgradePath } = useSignalTier()
  const [mailboxes, setMailboxes] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editingMailbox, setEditingMailbox] = useState(null)
  const [testTarget, setTestTarget] = useState(null) // {mailbox, to}
  const [testSending, setTestSending] = useState(false)

  const fetchMailboxes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await outreachApi.listMailboxes()
      setMailboxes(res.data || [])
    } catch (err) {
      if (err?.response?.status !== 403) toast.error('Failed to load mailboxes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (hasFullSignal) fetchMailboxes()
    else setLoading(false)
  }, [hasFullSignal, fetchMailboxes])

  const handleConnect = async (mailbox) => {
    try {
      const redirectUri = `${window.location.origin}/outreach-oauth-callback`
      const res = await outreachApi.initiateMailboxOAuth(mailbox.id, redirectUri)
      const authUrl = res?.data?.authUrl
      if (!authUrl) throw new Error('No auth URL returned')
      toast.message('Opening Google consent window…')
      const result = await openOAuthPopup(authUrl)
      if (result?.oauth === 'success') {
        toast.success(`Connected ${result.email || mailbox.email_address}`)
      } else if (result?.oauth === 'error') {
        toast.error(`Gmail connect failed: ${result.reason || 'unknown'}`)
      }
      await fetchMailboxes()
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Gmail connect failed')
    }
  }

  const handleDisconnect = async (mailbox) => {
    if (!window.confirm(`Disconnect Gmail from ${mailbox.email_address}?`)) return
    try {
      await outreachApi.disconnectMailbox(mailbox.id)
      toast.success('Disconnected')
      await fetchMailboxes()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Disconnect failed')
    }
  }

  const handleTogglePaused = async (mailbox) => {
    try {
      await outreachApi.setMailboxPaused(
        mailbox.id,
        !mailbox.paused,
        mailbox.paused ? null : 'Manually paused',
      )
      toast.success(mailbox.paused ? 'Mailbox resumed' : 'Mailbox paused')
      await fetchMailboxes()
    } catch (err) {
      toast.error('Failed to update pause state')
    }
  }

  const handleDelete = async (mailbox) => {
    if (!window.confirm(`Delete mailbox ${mailbox.email_address}? This cannot be undone.`)) return
    try {
      await outreachApi.deleteMailbox(mailbox.id)
      toast.success('Mailbox deleted')
      await fetchMailboxes()
    } catch (err) {
      toast.error('Delete failed')
    }
  }

  const handleTestSend = async () => {
    if (!testTarget?.mailbox?.id || !testTarget?.to) return
    setTestSending(true)
    try {
      const res = await outreachApi.sendMailboxTestEmail(testTarget.mailbox.id, {
        to: testTarget.to,
      })
      toast.success(`Sent! messageId ${res?.data?.messageId?.slice(0, 10)}…`)
      setTestTarget(null)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Test send failed')
    } finally {
      setTestSending(false)
    }
  }

  // ─── Plan gate ────────────────────────────────────────────────────────
  if (!hasFullSignal) {
    return (
      <div className="p-6">
        <GlassCard>
          <GlassCardContent className="flex flex-col items-center text-center py-16 px-6">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center">
              <Lock className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Mailboxes require Full Signal AI
            </h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">
              Each mailbox is a connected Gmail identity that sends cold outreach on a jittered
              human-like schedule. Upgrade to Full Signal AI to connect your sending fleet.
            </p>
            {upgradeLabel && upgradePath && (
              <Button asChild>
                <a href={upgradePath}>{upgradeLabel}</a>
              </Button>
            )}
          </GlassCardContent>
        </GlassCard>
      </div>
    )
  }

  if (loading) return <OutreachLoading label="Loading mailboxes" />

  // ─── Editor view ──────────────────────────────────────────────────────
  if (creating || editingMailbox) {
    return (
      <div className="p-6">
        <MailboxEditor
          mailbox={creating ? null : editingMailbox}
          onSaved={async () => {
            setCreating(false)
            setEditingMailbox(null)
            await fetchMailboxes()
          }}
          onCancelled={() => {
            setCreating(false)
            setEditingMailbox(null)
          }}
        />
      </div>
    )
  }

  // ─── Empty state ──────────────────────────────────────────────────────
  if (mailboxes.length === 0) {
    return (
      <div className="p-6">
        <OutreachEmptyState
          icon={Mail}
          title="No mailboxes yet"
          description="A mailbox is a single Gmail sending identity — one human persona per mailbox, each on its own human-like schedule. You'll connect one Gmail account per mailbox via OAuth."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New mailbox
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Sending fleet</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {mailboxes.length} mailbox{mailboxes.length === 1 ? '' : 'es'} —{' '}
            {mailboxes.filter((m) => m.gmail_oauth_tokens).length} connected
          </p>
        </div>
        <Button onClick={() => setCreating(true)} size="sm">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New mailbox
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mailboxes.map((m) => {
          const connected = !!m.gmail_oauth_tokens
          const status = m.paused ? 'paused' : connected ? 'active' : 'pending'
          return (
            <GlassCard key={m.id}>
              <GlassCardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <GlassCardTitle className="truncate">{m.display_name}</GlassCardTitle>
                    <GlassCardDescription className="truncate">
                      {m.email_address}
                    </GlassCardDescription>
                  </div>
                  <OutreachStatusBadge status={status} />
                </div>
              </GlassCardHeader>
              <GlassCardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <div className="text-[var(--text-tertiary)] uppercase tracking-wide">
                      Daily target
                    </div>
                    <div className="text-[var(--text-primary)] font-medium">{m.daily_target}</div>
                  </div>
                  <div>
                    <div className="text-[var(--text-tertiary)] uppercase tracking-wide">
                      Sent today
                    </div>
                    <div className="text-[var(--text-primary)] font-medium">{m.sent_today}</div>
                  </div>
                  <div>
                    <div className="text-[var(--text-tertiary)] uppercase tracking-wide">
                      Strategy
                    </div>
                    <div className="text-[var(--text-primary)] font-medium capitalize">
                      {(m.strategy_tier || '').replace(/_/g, ' ')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--text-tertiary)] uppercase tracking-wide">
                      Window
                    </div>
                    <div className="text-[var(--text-primary)] font-medium">
                      {(m.window_start_local || '').slice(0, 5)}–
                      {(m.window_end_local || '').slice(0, 5)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)]">
                  {connected ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      <span>Connected as {maskEmail(m.gmail_oauth_email || m.email_address)}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 text-[var(--text-tertiary)]" />
                      <span>Not connected</span>
                    </>
                  )}
                </div>

                {m.last_sent_at && (
                  <div className="text-[11px] text-[var(--text-tertiary)]">
                    Last send: {formatLocal(m.last_sent_at)}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {!connected && (
                    <Button size="sm" variant="outline" onClick={() => handleConnect(m)}>
                      <Mail className="h-3.5 w-3.5 mr-1.5" /> Connect Gmail
                    </Button>
                  )}
                  {connected && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTestTarget({ mailbox: m, to: '' })}
                      >
                        <Send className="h-3.5 w-3.5 mr-1.5" /> Test send
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleTogglePaused(m)}>
                        {m.paused ? (
                          <Play className="h-3.5 w-3.5 mr-1.5" />
                        ) : (
                          <Pause className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        {m.paused ? 'Resume' : 'Pause'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDisconnect(m)}>
                        <Unplug className="h-3.5 w-3.5 mr-1.5" /> Disconnect
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setEditingMailbox(m)}>
                    <SettingsIcon className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(m)}
                    className="text-red-600 hover:text-red-700 border-red-500/20"
                  >
                    Delete
                  </Button>
                </div>
              </GlassCardContent>
            </GlassCard>
          )
        })}
      </div>

      {/* Test send dialog */}
      <Dialog open={!!testTarget} onOpenChange={(open) => !open && setTestTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test send from {testTarget?.mailbox?.display_name}</DialogTitle>
            <DialogDescription>
              Sends a real email via the same Gmail OAuth tokens and code path as the drip
              processor. Use a recipient you own.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="test-to">Recipient</Label>
            <Input
              id="test-to"
              type="email"
              value={testTarget?.to || ''}
              onChange={(e) => setTestTarget((t) => ({ ...t, to: e.target.value }))}
              placeholder="me@myownemail.com"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleTestSend} disabled={testSending || !testTarget?.to}>
              {testSending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Sending
                </>
              ) : (
                'Send test'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
