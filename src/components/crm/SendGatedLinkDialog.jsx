/**
 * SendGatedLinkDialog - Send a gated page access link to a prospect
 *
 * Creates a magic link token via the Gates API and optionally sends
 * a branded email. Used for gating external pages like QCR menu pricing.
 */
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Link2,
  Send,
  Loader2,
  Copy,
  Check,
  Mail,
  Eye,
  Edit3,
  User,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { gatesApi } from '@/lib/sonor-api'
import { cn } from '@/lib/utils'

const EXPIRY_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
]

export default function SendGatedLinkDialog({
  open,
  onOpenChange,
  contact,
  projectId,
  gatedPageConfigs = [],
  onSuccess,
}) {
  const [activeTab, setActiveTab] = useState('compose')
  const [isSending, setIsSending] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState(null)
  const [metadata, setMetadata] = useState({})
  const [expiryDays, setExpiryDays] = useState(30)
  const [emailData, setEmailData] = useState({
    subject: '',
    personalMessage: '',
  })

  const firstName = contact?.name?.split(' ')[0] || contact?.first_name || ''

  // Reset state when dialog opens
  useEffect(() => {
    if (open && contact) {
      const config = gatedPageConfigs[0] || null
      setSelectedConfig(config)
      setMetadata({})
      setExpiryDays(30)
      setActiveTab('compose')
      setCopied(false)
      setEmailData({
        subject: firstName
          ? `${firstName}, your custom pricing is ready`
          : 'Your custom pricing is ready',
        personalMessage: firstName
          ? `Hi ${firstName},\n\nHere's your personalized pricing link. Click below to view and customize your options.`
          : 'Here\'s your personalized pricing link. Click below to view and customize your options.',
      })
    }
  }, [open, contact, firstName, gatedPageConfigs])

  // Update metadata when config changes
  useEffect(() => {
    if (selectedConfig?.metadataFields) {
      const defaults = {}
      selectedConfig.metadataFields.forEach((field) => {
        if (field.options?.length) {
          defaults[field.key] = field.options[0]
        }
      })
      setMetadata(defaults)
    }
  }, [selectedConfig])

  async function handleSend() {
    if (!contact?.id || !selectedConfig) return
    setIsSending(true)

    try {
      const { data } = await gatesApi.createToken({
        contactId: contact.id,
        gateUrl: selectedConfig.url,
        expiresInDays: expiryDays,
        metadata,
        message: emailData.personalMessage,
        sendEmail: true,
      })

      toast.success('Gated link sent successfully')
      onSuccess?.()
      onOpenChange?.(false)
    } catch (err) {
      console.error('Failed to send gated link:', err)
      toast.error('Failed to send gated link')
    } finally {
      setIsSending(false)
    }
  }

  async function handleCopyLink() {
    if (!contact?.id || !selectedConfig) return
    setIsCopying(true)

    try {
      const { data } = await gatesApi.createToken({
        contactId: contact.id,
        gateUrl: selectedConfig.url,
        expiresInDays: expiryDays,
        metadata,
        sendEmail: false,
      })

      await navigator.clipboard.writeText(data.fullUrl)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      console.error('Failed to generate link:', err)
      toast.error('Failed to generate link')
    } finally {
      setIsCopying(false)
    }
  }

  if (!contact) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
            Send Gated Link
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Recipient */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {(contact.name || contact.first_name || 'P')[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{contact.name || `${contact.first_name} ${contact.last_name}`}</p>
              <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
            </div>
          </div>

          {/* No pages configured */}
          {gatedPageConfigs.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <div className="p-3 rounded-xl bg-muted/50">
                <Link2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No gated pages configured</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Go to Project Settings → Gated Pages to add a page URL and metadata fields.
              </p>
            </div>
          )}

          {/* Page selector */}
          {gatedPageConfigs.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Page</Label>
              <Select
                value={selectedConfig?.id || ''}
                onValueChange={(id) => {
                  const config = gatedPageConfigs.find((c) => c.id === id)
                  setSelectedConfig(config)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a gated page" />
                </SelectTrigger>
                <SelectContent>
                  {gatedPageConfigs.map((config) => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dynamic metadata fields */}
          {selectedConfig?.metadataFields?.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs font-medium">{field.label}</Label>
              {field.type === 'select' ? (
                <Select
                  value={metadata[field.key] || ''}
                  onValueChange={(val) =>
                    setMetadata((prev) => ({ ...prev, [field.key]: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={metadata[field.key] || ''}
                  onChange={(e) =>
                    setMetadata((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                />
              )}
            </div>
          ))}

          {/* Expiry */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Expires
            </Label>
            <Select
              value={String(expiryDays)}
              onValueChange={(val) => setExpiryDays(Number(val))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email compose */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="compose" className="text-xs gap-1.5">
                <Edit3 className="h-3 w-3" />
                Compose
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs gap-1.5">
                <Eye className="h-3 w-3" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="compose" className="space-y-3 mt-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Subject</Label>
                <Input
                  value={emailData.subject}
                  onChange={(e) =>
                    setEmailData((prev) => ({ ...prev, subject: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Personal message</Label>
                <Textarea
                  value={emailData.personalMessage}
                  onChange={(e) =>
                    setEmailData((prev) => ({
                      ...prev,
                      personalMessage: e.target.value,
                    }))
                  }
                  rows={4}
                  className="resize-none"
                />
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-3">
              <div className="rounded-lg border p-4 bg-white space-y-3 text-sm">
                <p className="font-medium">{emailData.subject}</p>
                <div className="border-t pt-3 whitespace-pre-wrap text-muted-foreground text-xs leading-relaxed">
                  {emailData.personalMessage}
                </div>
                <div className="pt-2">
                  <div
                    className="inline-block rounded-lg px-6 py-2.5 text-sm font-medium text-white"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    View Your Pricing &rarr;
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground/60">
                  This link expires in {expiryDays} days.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            disabled={isCopying || !selectedConfig}
            className="gap-1.5"
          >
            {isCopying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={isSending || !selectedConfig || !contact?.email}
            className="gap-1.5"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {isSending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
