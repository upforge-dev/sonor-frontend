/**
 * EmailSettingsTab — Email platform configuration with Liquid Glass design
 *
 * Extracted from EmailPlatform.jsx and rebuilt with glass design system
 * and critical UX fixes:
 *
 * 1. Provider status banner at top — green glass when configured, amber when not
 * 2. Validation error details shown inline — not just a red icon
 * 3. Business address is required — red asterisk + validation on save
 * 4. track_opens / track_clicks Switch components rendered (were in state but invisible)
 * 5. All cards use GlassCard
 *
 * Props: none
 *
 * Design tokens: --brand-primary, --text-primary, --text-secondary,
 * --text-tertiary, --glass-bg, --glass-border, --glass-border-strong
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
} from '@/components/ui/glass-card'
import { OutreachLoading } from '@/components/outreach/ui'
import GmailConnectCard from '@/components/email/GmailConnectCard'
import {
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  Palette,
  Send,
  Eye,
  MousePointerClick,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import useAuthStore from '@/lib/auth-store'
import { useEmailPlatformStore } from '@/lib/email-platform-store'
import { emailApi } from '@/lib/sonor-api'
import { cn } from '@/lib/utils'

export default function EmailSettingsTab() {
  const { currentOrg, currentProject } = useAuthStore()
  const {
    settings: storeSettings,
    settingsLoading,
    fetchSettings,
    updateSettings,
    validateApiKey,
  } = useEmailPlatformStore()

  const [localSettings, setLocalSettings] = useState({
    resend_api_key: '',
    default_from_name: '',
    default_from_email: '',
    default_reply_to: '',
    brand_color: '#4F46E5',
    logo_url: '',
    business_address: '',
    track_opens: true,
    track_clicks: true,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [apiKeyValid, setApiKeyValid] = useState(null)
  const [validationError, setValidationError] = useState(null)
  const [saveErrors, setSaveErrors] = useState({})
  const [emailCapability, setEmailCapability] = useState(null)

  useEffect(() => {
    fetchSettings()
    if (currentProject?.id) {
      emailApi.checkEmailCapability(currentProject.id)
        .then(res => setEmailCapability(res.data || res))
        .catch(() => setEmailCapability(null))
    }
  }, [fetchSettings, currentProject?.id])

  useEffect(() => {
    if (settingsLoading) return

    const s = storeSettings || {}
    const merged = {
      resend_api_key: s.resend_api_key || '',
      default_from_name: s.default_from_name || '',
      default_from_email: s.default_from_email || '',
      default_reply_to: s.default_reply_to || '',
      brand_color: s.brand_color || '#4F46E5',
      logo_url: s.logo_url || '',
      business_address: s.company_address || '',
      track_opens: s.track_opens ?? true,
      track_clicks: s.track_clicks ?? true,
    }

    if (!merged.brand_color || merged.brand_color === '#4F46E5') {
      merged.brand_color = currentProject?.brand_primary || '#4F46E5'
    }
    if (!merged.logo_url) {
      merged.logo_url = currentProject?.logo_url || ''
    }
    if (!merged.business_address) {
      const addr = [
        currentProject?.address_line1,
        currentProject?.city,
        currentProject?.state_code,
        currentProject?.postal_code,
      ].filter(Boolean).join(', ')
      merged.business_address = addr || ''
    }

    setLocalSettings(merged)
    setApiKeyValid(storeSettings?.resend_api_key_valid ?? null)
  }, [storeSettings, settingsLoading, currentProject])

  // ── Validation ────────────────────────────────────────────────────────
  const handleValidateApiKey = async () => {
    if (!localSettings.resend_api_key) {
      toast.error('Enter an API key first')
      return
    }
    setIsValidating(true)
    setValidationError(null)
    try {
      const result = await validateApiKey(localSettings.resend_api_key)
      setApiKeyValid(result.valid)
      if (result.valid) {
        toast.success('API key is valid!')
        setValidationError(null)
      } else {
        const msg = result.error || result.message || 'The API key was rejected by Resend'
        setValidationError(msg)
        toast.error('Invalid API key')
      }
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Could not reach Resend to validate the key'
      setValidationError(msg)
      toast.error('Failed to validate API key')
      setApiKeyValid(false)
    } finally {
      setIsValidating(false)
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const errors = {}
    if (!localSettings.business_address?.trim()) {
      errors.business_address = 'Business address is required for CAN-SPAM compliance'
    }
    if (Object.keys(errors).length > 0) {
      setSaveErrors(errors)
      toast.error('Please fix validation errors before saving')
      return
    }
    setSaveErrors({})
    setIsSaving(true)
    try {
      await updateSettings({
        resendApiKey: localSettings.resend_api_key,
        defaultFromName: localSettings.default_from_name,
        defaultFromEmail: localSettings.default_from_email,
        defaultReplyTo: localSettings.default_reply_to,
        trackOpens: localSettings.track_opens,
        trackClicks: localSettings.track_clicks,
        brandColor: localSettings.brand_color,
        logoUrl: localSettings.logo_url,
        businessAddress: localSettings.business_address,
      })
      toast.success('Settings saved!')
    } catch (err) {
      toast.error(err?.message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = (key, value) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
    // Clear field-level error on change
    if (saveErrors[key]) {
      setSaveErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────
  const isConfigured = emailCapability?.enabled || apiKeyValid === true

  if (settingsLoading) return <OutreachLoading label="Loading settings..." />

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PROVIDER STATUS BANNER                                        */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <GlassCard
        className={cn(
          'overflow-hidden',
          isConfigured
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-amber-500/5 border-amber-500/20'
        )}
      >
        <GlassCardContent className="py-4">
          <div className="flex items-center gap-3">
            {isConfigured ? (
              <>
                <div className="p-2 rounded-xl bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-emerald-700">
                    {emailCapability?.provider === 'gmail'
                      ? 'Email configured via Gmail'
                      : emailCapability?.provider === 'resend'
                        ? 'Email configured via custom domain'
                        : 'Email configured via Resend'}
                  </p>
                  <p className="text-xs text-emerald-600/70">
                    {emailCapability?.email
                      ? `Sending as ${emailCapability.email}`
                      : 'Ready to send emails'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-2 rounded-xl bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-amber-700">
                    No email provider configured
                  </p>
                  <p className="text-xs text-amber-600/70">
                    Set up a domain, connect Gmail, or add your own Resend API key
                  </p>
                </div>
              </>
            )}
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* RESEND API CONFIGURATION                                      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle>Resend API Key (Optional)</GlassCardTitle>
          <GlassCardDescription>
            {emailCapability?.enabled
              ? 'Your project already sends email via Domain Setup. Only add a key here if you want to use your own Resend account instead.'
              : 'Connect your own Resend account, or set up a domain in Domain Setup to use Sonor\'s shared infrastructure.'}
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <div>
            <Label className="text-[var(--text-primary)] text-sm font-medium mb-2 block">
              API Key
            </Label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={localSettings.resend_api_key}
                onChange={(e) => {
                  updateField('resend_api_key', e.target.value)
                  // Reset validation state when key changes
                  setApiKeyValid(null)
                  setValidationError(null)
                }}
                placeholder="re_..."
                className="font-mono bg-[var(--glass-bg)] border-[var(--glass-border)]"
              />
              <Button
                variant="outline"
                onClick={handleValidateApiKey}
                disabled={isValidating}
                className="border-[var(--glass-border)] min-w-[90px]"
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : apiKeyValid === true ? (
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Valid
                  </span>
                ) : apiKeyValid === false ? (
                  <span className="flex items-center gap-1.5 text-red-500">
                    <XCircle className="h-4 w-4" />
                    Invalid
                  </span>
                ) : (
                  'Validate'
                )}
              </Button>
            </div>
            {/* Validation error detail */}
            {apiKeyValid === false && validationError && (
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-500/5 border border-red-500/15 px-3 py-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-600">{validationError}</p>
              </div>
            )}
            <p className="text-xs text-[var(--text-tertiary)] mt-1.5">
              Get your API key from{' '}
              <a
                href="https://resend.com/api-keys"
                target="_blank"
                rel="noopener"
                className="text-[var(--brand-primary)] hover:underline inline-flex items-center gap-0.5"
              >
                resend.com/api-keys
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* ── Gmail Connection ──────────────────────────────────────────── */}
      <GmailConnectCard className="mb-0" />

      {/* ── Or Divider ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="flex-1 border-t border-dashed border-[var(--glass-border)]" />
        <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide">
          or use Resend settings below
        </span>
        <div className="flex-1 border-t border-dashed border-[var(--glass-border)]" />
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* DEFAULT SENDER                                                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <GlassCard>
        <GlassCardHeader>
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-[var(--text-secondary)]" />
            <GlassCardTitle>Default Sender</GlassCardTitle>
          </div>
          <GlassCardDescription>
            Default sender information for campaigns
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block text-[var(--text-primary)]">
                From Name
              </Label>
              <Input
                value={localSettings.default_from_name}
                onChange={(e) => updateField('default_from_name', e.target.value)}
                placeholder="Your Company"
                className="bg-[var(--glass-bg)] border-[var(--glass-border)]"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block text-[var(--text-primary)]">
                From Email
              </Label>
              <Input
                type="email"
                value={localSettings.default_from_email}
                onChange={(e) => updateField('default_from_email', e.target.value)}
                placeholder="hello@yourdomain.com"
                className="bg-[var(--glass-bg)] border-[var(--glass-border)]"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block text-[var(--text-primary)]">
              Reply-To Email
            </Label>
            <Input
              type="email"
              value={localSettings.default_reply_to}
              onChange={(e) => updateField('default_reply_to', e.target.value)}
              placeholder="support@yourdomain.com"
              className="bg-[var(--glass-bg)] border-[var(--glass-border)]"
            />
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TRACKING SETTINGS                                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <GlassCard>
        <GlassCardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[var(--text-secondary)]" />
            <GlassCardTitle>Tracking</GlassCardTitle>
          </div>
          <GlassCardDescription>
            Control what engagement data is collected
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent className="space-y-5">
          {/* Track Opens */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[var(--glass-bg-inset)]">
                <Eye className="h-4 w-4 text-[var(--text-secondary)]" />
              </div>
              <div>
                <Label className="text-sm font-medium text-[var(--text-primary)]">
                  Track Opens
                </Label>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Embed a tracking pixel to detect when emails are opened
                </p>
              </div>
            </div>
            <Switch
              checked={localSettings.track_opens}
              onCheckedChange={(v) => updateField('track_opens', v)}
            />
          </div>
          {/* Track Clicks */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[var(--glass-bg-inset)]">
                <MousePointerClick className="h-4 w-4 text-[var(--text-secondary)]" />
              </div>
              <div>
                <Label className="text-sm font-medium text-[var(--text-primary)]">
                  Track Clicks
                </Label>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Rewrite links to track when recipients click them
                </p>
              </div>
            </div>
            <Switch
              checked={localSettings.track_clicks}
              onCheckedChange={(v) => updateField('track_clicks', v)}
            />
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* BRANDING                                                      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <GlassCard>
        <GlassCardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-[var(--text-secondary)]" />
            <GlassCardTitle>Branding</GlassCardTitle>
          </div>
          <GlassCardDescription>
            Customize your email appearance
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          {/* Brand Color */}
          <div>
            <Label className="text-sm font-medium mb-2 block text-[var(--text-primary)]">
              Brand Color
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={localSettings.brand_color}
                onChange={(e) => updateField('brand_color', e.target.value)}
                className="h-10 w-20 rounded-lg cursor-pointer border border-[var(--glass-border)]"
              />
              <Input
                value={localSettings.brand_color}
                onChange={(e) => updateField('brand_color', e.target.value)}
                className="w-28 font-mono bg-[var(--glass-bg)] border-[var(--glass-border)]"
              />
            </div>
          </div>
          {/* Logo URL */}
          <div>
            <Label className="text-sm font-medium mb-2 block text-[var(--text-primary)]">
              Logo URL
            </Label>
            <Input
              value={localSettings.logo_url}
              onChange={(e) => updateField('logo_url', e.target.value)}
              placeholder="https://..."
              className="bg-[var(--glass-bg)] border-[var(--glass-border)]"
            />
          </div>
          {/* Business Address (required) */}
          <div>
            <Label className="text-sm font-medium mb-2 block text-[var(--text-primary)]">
              Business Address <span className="text-red-500">*</span>
            </Label>
            <Input
              value={localSettings.business_address}
              onChange={(e) => updateField('business_address', e.target.value)}
              placeholder="123 Business St, City, State 12345"
              className={cn(
                'bg-[var(--glass-bg)]',
                saveErrors.business_address
                  ? 'border-red-500 focus-visible:ring-red-500/20'
                  : 'border-[var(--glass-border)]'
              )}
            />
            {saveErrors.business_address ? (
              <p className="text-xs text-red-500 mt-1">
                {saveErrors.business_address}
              </p>
            ) : (
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Required for CAN-SPAM compliance. Must be a physical mailing address.
              </p>
            )}
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* ── Save Button ───────────────────────────────────────────────── */}
      <div className="flex justify-end pb-4">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  )
}
