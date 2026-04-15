import { useEffect } from 'react'

/**
 * OutreachOAuthCallback — the target page for the mailbox Gmail OAuth popup.
 *
 * The backend's GET /outreach/mailboxes/oauth/callback completes the token
 * exchange and then 302s to `${frontendOrigin}/outreach-oauth-callback` with
 * `?oauth=success&mailboxId=...&email=...` or `?oauth=error&reason=...`.
 *
 * This component reads those params, posts a message to window.opener (the
 * parent that opened the popup via window.open in MailboxesTab), and closes
 * itself. The parent's message listener resolves the pending Promise and
 * refreshes its mailbox list.
 */
export default function OutreachOAuthCallback() {
  useEffect(() => {
    const url = new URL(window.location.href)
    const payload = {
      oauth: url.searchParams.get('oauth') || 'unknown',
      mailboxId: url.searchParams.get('mailboxId') || undefined,
      email: url.searchParams.get('email') || undefined,
      reason: url.searchParams.get('reason') || undefined,
    }

    // Post back to the opener window (the Mailboxes tab that opened us)
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'sonor-mailbox-oauth', payload }, window.location.origin)
      }
    } catch (err) {
      // Cross-origin issues fall through — the parent will still notice via
      // popup.closed polling and refetch.
    }

    // Give the message a tick, then close
    const id = setTimeout(() => {
      try {
        window.close()
      } catch {}
    }, 200)
    return () => clearTimeout(id)
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'system-ui, sans-serif',
        color: '#555',
        textAlign: 'center',
        padding: '1rem',
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 14 }}>Finalizing mailbox connection…</p>
        <p style={{ margin: '0.25rem 0 0', fontSize: 12, color: '#999' }}>
          You can close this window.
        </p>
      </div>
    </div>
  )
}
