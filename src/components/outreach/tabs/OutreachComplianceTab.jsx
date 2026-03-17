import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  ShieldCheck, Loader2, Ban, Upload, Search, Trash2, Settings, Clock, MapPin, Key, ExternalLink,
  Eye, EyeOff, CheckCircle2, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { outreachApi } from '@/lib/portal-api'

export default function OutreachComplianceTab() {
  const [settings, setSettings] = useState(null)
  const [suppressions, setSuppressions] = useState([])
  const [suppressionCount, setSuppressionCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [tab, setTab] = useState('api')

  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, suppressionsRes] = await Promise.all([
        outreachApi.getSettings(),
        outreachApi.listSuppressions({ limit: 50 }),
      ])
      setSettings(settingsRes.data)
      setSuppressions(suppressionsRes.data?.data || [])
      setSuppressionCount(suppressionsRes.data?.count || 0)
    } catch (err) {
      toast.error('Failed to load compliance data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleUpdateSetting = async (key, value) => {
    try {
      await outreachApi.updateSettings({ [key]: value })
      setSettings(prev => ({ ...prev, [key]: value }))
      toast.success('Settings updated')
    } catch (err) {
      toast.error('Failed to update settings')
    }
  }

  const handleAddSuppression = async () => {
    if (!addEmail.trim()) return
    try {
      await outreachApi.addSuppression(addEmail.trim(), 'manual')
      setAddEmail('')
      toast.success('Email added to suppression list')
      fetchData()
    } catch (err) {
      toast.error('Failed to add suppression')
    }
  }

  const handleRemoveSuppression = async (email) => {
    try {
      await outreachApi.removeSuppression(email)
      toast.success('Suppression removed')
      fetchData()
    } catch (err) {
      toast.error('Failed to remove suppression')
    }
  }

  const handleImport = async (text) => {
    const emails = text.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean)
    if (emails.length === 0) return
    try {
      await outreachApi.importSuppressions(emails, 'manual')
      toast.success(`Imported ${emails.length} emails`)
      setShowImport(false)
      fetchData()
    } catch (err) {
      toast.error('Failed to import')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Compliance & Deliverability</h2>
        <p className="text-muted-foreground">API integration, CAN-SPAM compliance, suppression list, and sending controls</p>
      </div>

      <div className="flex gap-2 border-b pb-2">
        {[
          { value: 'api', label: 'API Integration', icon: Key },
          { value: 'settings', label: 'CAN-SPAM Settings', icon: Settings },
          { value: 'suppressions', label: `Suppression List (${suppressionCount})`, icon: Ban },
          { value: 'sending', label: 'Sending Controls', icon: Clock },
        ].map((t) => (
          <Button key={t.value} variant={tab === t.value ? 'default' : 'ghost'} size="sm" onClick={() => setTab(t.value)} className="gap-1.5">
            <t.icon className="h-3.5 w-3.5" />{t.label}
          </Button>
        ))}
      </div>

      {tab === 'api' && (
        <ResendApiKeySection settings={settings} onUpdate={handleUpdateSetting} onRefresh={fetchData} />
      )}

      {tab === 'settings' && (
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>CAN-SPAM Requirements</CardTitle>
              <CardDescription>Required for all commercial emails sent from the US</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Physical Address (required)</Label>
                <Textarea
                  placeholder="123 Main St, Suite 100, New York, NY 10001"
                  value={settings?.physical_address || ''}
                  onChange={(e) => setSettings(s => ({ ...s, physical_address: e.target.value }))}
                  onBlur={(e) => handleUpdateSetting('physical_address', e.target.value)}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground mt-1">Appears in footer of every cold outreach email</p>
              </div>
              <div>
                <Label>Default From Name</Label>
                <Input
                  placeholder="John from Acme"
                  value={settings?.default_from_name || ''}
                  onChange={(e) => setSettings(s => ({ ...s, default_from_name: e.target.value }))}
                  onBlur={(e) => handleUpdateSetting('default_from_name', e.target.value)}
                />
              </div>
              <div>
                <Label>Default Reply-To</Label>
                <Input
                  placeholder="hello@yourdomain.com"
                  value={settings?.default_reply_to || ''}
                  onChange={(e) => setSettings(s => ({ ...s, default_reply_to: e.target.value }))}
                  onBlur={(e) => handleUpdateSetting('default_reply_to', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Compliance Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Resend API key', ok: !!settings?.resend_api_key_set },
                { label: 'Physical address', ok: !!settings?.physical_address },
                { label: 'One-click unsubscribe (RFC 8058)', ok: true },
                { label: 'List-Unsubscribe header', ok: true },
                { label: 'Suppression list active', ok: true },
                { label: 'Sender identification', ok: !!settings?.default_from_name },
                { label: 'Domain warmup enabled', ok: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.ok ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">✓</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">✗</Badge>
                  )}
                  <span className="text-sm">{item.label}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <Label>GDPR Mode</Label>
                  <p className="text-xs text-muted-foreground">Enable stricter EU compliance</p>
                </div>
                <Switch
                  checked={settings?.gdpr_mode || false}
                  onCheckedChange={(checked) => handleUpdateSetting('gdpr_mode', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'suppressions' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppressions..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Input placeholder="Add email..." value={addEmail} onChange={(e) => setAddEmail(e.target.value)} className="w-64" />
              <Button size="sm" onClick={handleAddSuppression} disabled={!addEmail.trim()}>Add</Button>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowImport(true)}>
              <Upload className="h-3.5 w-3.5" />Import
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {suppressions
                  .filter(s => !searchQuery || s.email?.includes(searchQuery.toLowerCase()))
                  .map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <span className="font-mono text-sm">{s.email}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-xs">{s.reason}</Badge>
                          <span className="text-xs text-muted-foreground">via {s.source}</span>
                          <span className="text-xs text-muted-foreground">{new Date(s.suppressed_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveSuppression(s.email)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                {suppressions.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Ban className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Suppression list is empty</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'sending' && (
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Sending Window</CardTitle>
              <CardDescription>Only send during business hours in the prospect's timezone</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={settings?.sending_window_start || '09:00'}
                    onChange={(e) => handleUpdateSetting('sending_window_start', e.target.value)}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={settings?.sending_window_end || '17:00'}
                    onChange={(e) => handleUpdateSetting('sending_window_end', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Timezone</Label>
                <Input
                  value={settings?.sending_timezone || 'America/New_York'}
                  onChange={(e) => handleUpdateSetting('sending_timezone', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Frequency & Automation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Frequency Cap (days)</Label>
                <Input
                  type="number"
                  value={settings?.frequency_cap_days || 14}
                  onChange={(e) => handleUpdateSetting('frequency_cap_days', parseInt(e.target.value) || 14)}
                />
                <p className="text-xs text-muted-foreground mt-1">Minimum days between emails to the same address</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Create CRM Leads</Label>
                  <p className="text-xs text-muted-foreground">Create leads from positive replies</p>
                </div>
                <Switch
                  checked={settings?.auto_create_leads ?? true}
                  onCheckedChange={(checked) => handleUpdateSetting('auto_create_leads', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Create Deals</Label>
                  <p className="text-xs text-muted-foreground">Create deals for qualified leads</p>
                </div>
                <Switch
                  checked={settings?.auto_create_deals ?? false}
                  onCheckedChange={(checked) => handleUpdateSetting('auto_create_deals', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ImportDialog open={showImport} onOpenChange={setShowImport} onImport={handleImport} />
    </div>
  )
}

function ResendApiKeySection({ settings, onUpdate, onRefresh }) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)

  const isConfigured = settings?.resend_api_key_set

  const handleSave = async () => {
    if (!apiKey.trim()) return
    setSaving(true)
    try {
      await onUpdate('resend_api_key', apiKey.trim())
      setApiKey('')
      setShowKey(false)
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setSaving(true)
    try {
      await onUpdate('resend_api_key', null)
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <Card className={isConfigured ? 'border-green-200' : 'border-amber-200'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Resend API Key
          </CardTitle>
          <CardDescription>
            Your own Resend API key — all sending domains and outreach emails are managed through your Resend account, not Sonor's.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConfigured ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-800">API Key Configured</p>
                  <p className="text-xs font-mono text-green-600 truncate">{settings?.resend_api_key_masked}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    placeholder="Replace with new key..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button onClick={handleSave} disabled={!apiKey.trim() || saving} size="sm">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={handleRemove} disabled={saving}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />Remove API Key
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <XCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">No API Key</p>
                  <p className="text-xs text-amber-600">Add your Resend API key to start managing domains and sending emails</p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    placeholder="re_xxxxxxxxxx..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button onClick={handleSave} disabled={!apiKey.trim() || saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Key'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="space-y-2">
            <p className="font-medium text-foreground">Why you need your own Resend key:</p>
            <ul className="space-y-1.5 ml-4 list-disc">
              <li>Your sending domains are registered under your Resend account</li>
              <li>Your domain reputation stays isolated from other Sonor users</li>
              <li>You have full control over your sending infrastructure</li>
              <li>Sonor never sees or stores your emails — they go direct from Resend</li>
            </ul>
          </div>
          <div className="space-y-2 pt-3 border-t">
            <p className="font-medium text-foreground">Getting started:</p>
            <ol className="space-y-1.5 ml-4 list-decimal">
              <li>Create a free account at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">resend.com<ExternalLink className="h-3 w-3" /></a></li>
              <li>Go to API Keys and create a key with full access</li>
              <li>Paste the key here</li>
              <li>Then go to "Sending Domains" to add your first domain</li>
            </ol>
          </div>
          <div className="pt-3 border-t">
            <p className="text-xs">Resend's free tier includes 3,000 emails/month and 100/day. Paid plans start at $20/mo for 50,000 emails.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ImportDialog({ open, onOpenChange, onImport }) {
  const [text, setText] = useState('')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Suppression List</DialogTitle>
          <DialogDescription>Paste emails separated by commas, semicolons, or newlines</DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder={"email1@example.com\nemail2@example.com\nemail3@example.com"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onImport(text); setText('') }} disabled={!text.trim()}>Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
