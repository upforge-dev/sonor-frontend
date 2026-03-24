// src/pages/public/SignatureInstall.jsx
// Public page (no auth) for viewing and installing an email signature.
// Accessed at /sig/:slug
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { renderSignature } from '../../components/outreach/signature-templates'
import { Loader2, Copy, Check, Sun, Moon, Mail, Monitor, Apple, Bird } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.sonor.io'

// ---------------------------------------------------------------------------
// Install instruction data
// ---------------------------------------------------------------------------

const INSTALL_TABS = [
  {
    key: 'gmail',
    label: 'Gmail',
    icon: Mail,
    steps: [
      'Open Gmail and click the gear icon, then "See all settings".',
      'Scroll down to the "Signature" section.',
      'Click "Create new" or select an existing signature to edit.',
      'Click inside the signature editor, then paste with Ctrl+V (Cmd+V on Mac).',
      'Scroll down and click "Save Changes".',
    ],
  },
  {
    key: 'outlook',
    label: 'Outlook',
    icon: Monitor,
    steps: [
      'Go to File > Options > Mail > Signatures (desktop) or Settings > Mail > Compose and reply (web).',
      'Click "New" to create a new signature.',
      'Give it a name, then click in the editor area.',
      'Paste with Ctrl+V (Cmd+V on Mac).',
      'Click "OK" or "Save" to apply.',
    ],
  },
  {
    key: 'apple',
    label: 'Apple Mail',
    icon: Apple,
    steps: [
      'Open Mail > Settings (or Preferences) > Signatures.',
      'Click the "+" button to add a new signature.',
      'Uncheck "Always match my default message font" at the bottom.',
      'Click in the signature preview area and paste with Cmd+V.',
      'Close the settings window to save.',
    ],
  },
  {
    key: 'thunderbird',
    label: 'Thunderbird',
    icon: Bird,
    steps: [
      'Go to Account Settings and select your email account.',
      'Check "Use HTML" beneath the signature text box.',
      'Click in the signature text box and paste with Ctrl+V.',
      'Click "OK" to save.',
    ],
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SignatureInstall() {
  const { slug } = useParams()

  const [signature, setSignature] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [darkPreview, setDarkPreview] = useState(false)
  const [activeTab, setActiveTab] = useState('gmail')

  const signatureRef = useRef(null)

  // Fetch signature data
  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)

    fetch(`${API_URL}/api/public/track/signatures?slug=${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Signature not found' : 'Failed to load signature')
        return res.json()
      })
      .then((data) => {
        setSignature(data.signature)
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [slug])

  // Copy signature HTML to clipboard
  const handleCopy = async () => {
    if (!signature) return

    try {
      // Build the HTML to copy
      const html = signature.template === 'animated' && signature.staticHtml
        ? signature.staticHtml
        : renderSignature(signature.config)

      // Use the Clipboard API with both HTML and plain-text representations
      const blob = new Blob([html], { type: 'text/html' })
      const textBlob = new Blob([html], { type: 'text/plain' })
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': textBlob,
        }),
      ])

      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback: select the rendered signature and use execCommand
      try {
        const el = signatureRef.current
        if (el) {
          const range = document.createRange()
          range.selectNodeContents(el)
          const sel = window.getSelection()
          sel.removeAllRanges()
          sel.addRange(range)
          document.execCommand('copy')
          sel.removeAllRanges()
          setCopied(true)
          setTimeout(() => setCopied(false), 2500)
        }
      } catch {
        // Silent fail
      }
    }
  }

  // Determine if signature is animated
  const isAnimated = signature?.template === 'animated' && signature?.animatedGifUrl

  // Render the signature preview HTML
  const signatureHtml = signature
    ? signature.staticHtml || renderSignature(signature.config)
    : ''

  // Current page URL for QR code
  const pageUrl = typeof window !== 'undefined' ? window.location.href : ''

  // Active install tab data
  const activeInstall = INSTALL_TABS.find((t) => t.key === activeTab)

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-zinc-400 text-sm">Loading signature...</p>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (error || !signature) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4">
        <div className="text-center max-w-md">
          <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Signature Not Found</h1>
          <p className="text-zinc-400 text-sm">
            {error || 'This signature link may have expired or is no longer available.'}
          </p>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Subtle gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-600 opacity-[0.06] blur-[120px] rounded-full" />
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-600 opacity-[0.06] blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-12 sm:py-16">
        {/* ---- Header ---- */}
        <header className="flex items-center gap-3 mb-10">
          <img src="/logo.svg" alt="Sonor" className="h-8 w-8" />
          <div>
            <h1 className="text-lg font-semibold text-white leading-tight">Email Signature</h1>
            {signature.name && (
              <p className="text-sm text-zinc-500">{signature.name}</p>
            )}
          </div>
        </header>

        {/* ---- Signature Preview ---- */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Preview</h2>
            <button
              onClick={() => setDarkPreview((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {darkPreview ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {darkPreview ? 'Light' : 'Dark'}
            </button>
          </div>

          <div
            className={`rounded-xl border p-6 sm:p-8 transition-colors ${
              darkPreview
                ? 'bg-zinc-900 border-zinc-700/50'
                : 'bg-white border-zinc-200'
            }`}
          >
            {isAnimated ? (
              <img
                src={signature.animatedGifUrl}
                alt="Animated email signature"
                className="max-w-full"
              />
            ) : (
              <div
                ref={signatureRef}
                dangerouslySetInnerHTML={{ __html: signatureHtml }}
              />
            )}
          </div>
        </section>

        {/* ---- Copy Button ---- */}
        <div className="mb-10">
          <button
            onClick={handleCopy}
            className={`w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-all ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied to Clipboard
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Signature to Clipboard
              </>
            )}
          </button>
          <p className="text-center text-xs text-zinc-600 mt-2">
            After copying, paste into your email client's signature settings
          </p>
        </div>

        {/* ---- QR Code ---- */}
        <section className="mb-10 flex flex-col items-center">
          <p className="text-xs text-zinc-500 mb-3">Scan to install on mobile</p>
          <div className="rounded-lg border border-zinc-800 bg-white p-2">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(pageUrl)}`}
              alt="QR code to this page"
              width={150}
              height={150}
              className="block"
            />
          </div>
        </section>

        {/* ---- Install Instructions ---- */}
        <section className="mb-12">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-4">
            Installation Guide
          </h2>

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg bg-zinc-900/60 border border-zinc-800 p-1 mb-5 overflow-x-auto">
            {INSTALL_TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Steps */}
          {activeInstall && (
            <ol className="space-y-3">
              {activeInstall.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-300">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-400">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* ---- Footer ---- */}
        <footer className="text-center border-t border-zinc-800/60 pt-6">
          <a
            href="https://sonor.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Powered by Sonor
          </a>
        </footer>
      </div>
    </div>
  )
}
