import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { outreachApi, emailApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'
import { useUploadFile } from '@/lib/hooks/use-files'
import { renderSignature, SIGNATURE_TEMPLATES } from '../signature-templates'
import EmailClientPreview from '../EmailClientPreview'
import { OutreachLoading } from '@/components/outreach/ui'
import { toast } from 'sonner'
import {
  ArrowLeft, Save, Copy, Mail, Loader2, Upload, Image, User,
  Linkedin, Twitter, Instagram, Facebook, Link2, ChevronDown,
  ChevronUp, Sun, Moon, Sparkles, Type, SlidersHorizontal,
  Circle, Square, Play, Eye, FlaskConical, Maximize2, RotateCcw,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const DEFAULT_CONFIG = {
  mode: 'standard',
  signatureName: '',
  name: '',
  title: '',
  company: '',
  email: '',
  phone: '',
  website: '',
  imageUrl: '',
  imageShape: 'circle',
  brandColor: '#2563eb',
  textColor: '#333333',
  template: 'classic',
  font: 'Inter',
  socials: { linkedin: '', twitter: '', instagram: '', facebook: '' },
  bookingCta: { label: '', url: '' },
  abTest: { enabled: false, variantA: { ctaLabel: '', ctaUrl: '' }, variantB: { ctaLabel: '', ctaUrl: '' } },
  animationStyle: 'fade-in',
  animatedTemplate: 'clean',
  bgColor: 'light',
  linkUrl: '',
  promoBanner: { imageUrl: '', linkUrl: '', altText: '', active: false },
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter', category: 'System default' },
  { value: 'Playfair Display', label: 'Playfair Display', category: 'Elegant serif' },
  { value: 'Montserrat', label: 'Montserrat', category: 'Clean sans' },
  { value: 'Lora', label: 'Lora', category: 'Warm serif' },
  { value: 'Poppins', label: 'Poppins', category: 'Modern geometric' },
  { value: 'Roboto Slab', label: 'Roboto Slab', category: 'Sturdy slab serif' },
  { value: 'DM Serif Display', label: 'DM Serif Display', category: 'Editorial' },
  { value: 'Space Grotesk', label: 'Space Grotesk', category: 'Tech / modern' },
]

const GOOGLE_FONTS_IMPORT_URL = 'https://fonts.googleapis.com/css2?family=Playfair+Display&family=Montserrat&family=Lora&family=Poppins&family=Roboto+Slab&family=DM+Serif+Display&family=Space+Grotesk&display=swap'

const ANIMATED_TEMPLATES = [
  { value: 'clean', label: 'Clean', description: 'Simple and professional' },
  { value: 'executive', label: 'Executive', description: 'Centered, large name, accent line' },
  { value: 'bold', label: 'Bold', description: 'Dark card with accent sidebar' },
  { value: 'creative', label: 'Creative', description: 'Asymmetric, playful typography' },
]

const IMAGE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'logo', label: 'Logo' },
  { value: 'profile', label: 'Profile' },
  { value: 'custom', label: 'Custom Upload' },
]

const ANIMATION_STYLES = [
  { value: 'fade-in', label: 'Fade In' },
  { value: 'slide-in', label: 'Slide In' },
  { value: 'typewriter', label: 'Typewriter' },
  { value: 'svg-draw', label: 'Draw Logo', hint: 'SVG logos only — draws the logo path by path' },
]

export default function SignatureEditor({ signatureId: initialSignatureId, onBack, onSaved }) {
  const [editId, setEditId] = useState(initialSignatureId || null)
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(!!initialSignatureId)
  const [saving, setSaving] = useState(false)
  const [copying, setCopying] = useState(false)
  const [applyingGmail, setApplyingGmail] = useState(false)
  const [previewBg, setPreviewBg] = useState('light')
  const [imageSource, setImageSource] = useState('')
  const [showSocials, setShowSocials] = useState(false)
  const [showBookingCta, setShowBookingCta] = useState(false)
  const [showAbTest, setShowAbTest] = useState(false)
  const [showPromoBanner, setShowPromoBanner] = useState(false)
  const [animatedGifUrl, setAnimatedGifUrl] = useState(null)
  const [showExpandedPreview, setShowExpandedPreview] = useState(false)

  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)
  const uploadFile = useUploadFile()
  const fileInputRef = useRef(null)
  const bannerFileInputRef = useRef(null)

  // Pre-fill from current user + project on create
  useEffect(() => {
    if (!editId && user) {
      setConfig((prev) => ({
        ...prev,
        name: user.name || user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        title: user.title || user.job_title || '',
        brandColor: currentProject?.brand_primary || prev.brandColor,
      }))
    }
  }, [editId, user, currentProject])

  // Fetch existing signature for edit
  useEffect(() => {
    if (!editId) return
    let cancelled = false

    async function fetchSignature() {
      try {
        const { data } = await outreachApi.getSignature(editId)
        if (cancelled) return
        const sig = data.signature || data

        // mode is stored as `template` in the DB, or in config.mode
        const savedMode = sig.config?.mode || sig.template || sig.mode || 'standard'
        setConfig({
          mode: savedMode === 'animated' ? 'animated' : 'standard',
          signatureName: sig.name || sig.signature_name || '',
          name: sig.config?.name || '',
          title: sig.config?.title || '',
          company: sig.config?.company || '',
          email: sig.config?.email || '',
          phone: sig.config?.phone || '',
          website: sig.config?.website || '',
          imageUrl: sig.config?.imageUrl || sig.config?.image_url || '',
          imageShape: sig.config?.imageShape || 'circle',
          brandColor: sig.config?.brandColor || '#2563eb',
          textColor: sig.config?.textColor || '#333333',
          template: sig.config?.template || 'classic',
          socials: sig.config?.socials || { linkedin: '', twitter: '', instagram: '', facebook: '' },
          bookingCta: sig.config?.bookingCta || { label: '', url: '' },
          abTest: sig.config?.abTest || { enabled: false, variantA: { ctaLabel: '', ctaUrl: '' }, variantB: { ctaLabel: '', ctaUrl: '' } },
          font: sig.config?.font || 'Inter',
          animationStyle: sig.config?.animationStyle || 'fade-in',
          animatedTemplate: sig.config?.animatedTemplate || 'clean',
          linkUrl: sig.config?.linkUrl || '',
          promoBanner: sig.config?.promoBanner || { imageUrl: '', linkUrl: '', altText: '', active: false },
        })

        if (sig.animated_gif_url) {
          setAnimatedGifUrl(sig.animated_gif_url)
        }

        // Determine image source from existing data
        if (sig.config?.imageUrl) {
          setImageSource('custom')
        }

        // Expand sections that have data
        const s = sig.config?.socials
        if (s && (s.linkedin || s.twitter || s.instagram || s.facebook)) {
          setShowSocials(true)
        }
        if (sig.config?.bookingCta?.label || sig.config?.bookingCta?.url) {
          setShowBookingCta(true)
        }
        if (sig.config?.abTest?.enabled) {
          setShowAbTest(true)
        }
        if (sig.config?.promoBanner?.active) {
          setShowPromoBanner(true)
        }
      } catch (err) {
        toast.error('Failed to load signature')
        onBack()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchSignature()
    return () => { cancelled = true }
  }, [editId, onBack])

  const updateConfig = useCallback((key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }, [])

  const updateNested = useCallback((parent, key, value) => {
    setConfig((prev) => ({
      ...prev,
      [parent]: { ...prev[parent], [key]: value },
    }))
  }, [])

  const handleImageUpload = async (e, target = 'image') => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!currentProject?.id) {
      toast.error('No project selected')
      return
    }

    try {
      const result = await uploadFile.mutateAsync({
        projectId: currentProject.id,
        file,
        category: 'signatures',
        isPublic: true,
      })
      const url = result.publicUrl || result.public_url || result.url
      if (target === 'banner') {
        updateNested('promoBanner', 'imageUrl', url)
      } else {
        updateConfig('imageUrl', url)
      }
      toast.success('Image uploaded')
    } catch (err) {
      const msg =
        err?.message ||
        err?.error_description ||
        err?.response?.data?.message ||
        (Array.isArray(err?.response?.data?.message) ? err.response.data.message.join(', ') : null)
      toast.error(msg ? `Upload failed: ${msg}` : 'Upload failed')
    }

    // Reset file input
    e.target.value = ''
  }

  const renderedHtml = useMemo(() => {
    if (config.mode !== 'standard') return ''
    return renderSignature(config)
  }, [config])

  const handleSave = async () => {
    if (!config.signatureName.trim()) {
      toast.error('Please enter a signature name')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: config.signatureName,
        template: config.mode, // 'standard' or 'animated' — stored as template field
        config: {
          mode: config.mode, // also in config so we can read it back
          name: config.name,
          title: config.title,
          company: config.company,
          email: config.email,
          phone: config.phone,
          website: config.website,
          imageUrl: config.imageUrl,
          imageShape: config.imageShape,
          brandColor: config.brandColor,
          textColor: config.textColor,
          template: config.template,
          font: config.font,
          socials: config.socials,
          bookingCta: config.bookingCta,
          abTest: config.abTest,
          animationStyle: config.animationStyle,
          animatedTemplate: config.animatedTemplate,
          linkUrl: config.linkUrl,
          promoBanner: config.promoBanner,
        },
      }

      if (editId) {
        await outreachApi.updateSignature(editId, payload)
        toast.success('Signature updated')
      } else {
        const created = await outreachApi.createSignature(payload)
        // Stay in editor but switch to edit mode so next save updates instead of creating
        if (created?.id) {
          setEditId(created.id)
        }
        toast.success('Signature created')
      }
      // Don't call onSaved() — stay in editor so user can render animation after saving
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save signature')
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = async () => {
    setCopying(true)
    try {
      if (config.mode === 'animated') {
        if (!animatedGifUrl) {
          toast.error('No animated signature rendered yet')
          setCopying(false)
          return
        }
        // Copy GIF wrapped in a styled card — Gmail renders hosted GIFs with animation
        const cleanUrl = (config.animatedGifUrl || animatedGifUrl).split('?')[0]
        const linkUrl = config.linkUrl || config.website || '#'
        // Rounded corners + border baked into GIF — just the img tag
        const imgTag = `<img src="${cleanUrl}" alt="${config.name}" width="480" style="display:block;border:0;" />`
        const imgHtml = linkUrl
          ? `<a href="${linkUrl}" style="text-decoration:none;border:0;">${imgTag}</a>`
          : imgTag
        try {
          const htmlBlob = new Blob([imgHtml], { type: 'text/html' })
          const textBlob = new Blob([imgHtml], { type: 'text/plain' })
          await navigator.clipboard.write([
            new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })
          ])
          toast.success('Animated signature copied — paste in Gmail compose')
        } catch {
          await navigator.clipboard.writeText(imgHtml)
          toast.success('Copied as HTML')
        }
      } else {
        // Standard signature: copy as rich HTML for paste with formatting
        try {
          const htmlBlob = new Blob([renderedHtml], { type: 'text/html' })
          const textBlob = new Blob([renderedHtml], { type: 'text/plain' })
          await navigator.clipboard.write([
            new ClipboardItem({
              'text/html': htmlBlob,
              'text/plain': textBlob,
            })
          ])
          toast.success('Signature copied — paste in any email client')
        } catch {
          await navigator.clipboard.writeText(renderedHtml)
          toast.success('Copied as HTML code')
        }
      }
    } catch (err) {
      toast.error('Failed to copy')
    } finally {
      setCopying(false)
    }
  }

  const handleApplyGmail = async () => {
    setApplyingGmail(true)
    try {
      let html
      if (isStandard) {
        html = renderedHtml
      } else {
        // For animated signatures, send an <img> tag pointing to the GIF
        if (!animatedGifUrl) {
          toast.error('Render the animation first before applying to Gmail')
          setApplyingGmail(false)
          return
        }
        // Strip cache buster for the permanent URL
        const cleanUrl = animatedGifUrl.split('?')[0]
        const linkUrl = config.linkUrl || config.website || ''
        // Rounded corners + border are baked into the GIF itself — no wrapper needed
        const imgTag = `<img src="${cleanUrl}" alt="${config.name || 'Email Signature'}" width="480" style="display:block;border:0;outline:none;" />`
        html = linkUrl
          ? `<a href="${linkUrl}" target="_blank" style="text-decoration:none;border:0;">${imgTag}</a>`
          : imgTag
      }
      await emailApi.setGmailSignature(html, currentProject?.id)
      toast.success('Signature applied to Gmail')
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('Gmail integration not connected. Connect your Gmail account in Settings to use this feature.')
      } else {
        toast.error(err.response?.data?.message || 'Failed to apply signature to Gmail')
      }
    } finally {
      setApplyingGmail(false)
    }
  }

  const [rendering, setRendering] = useState(false)

  const handleRenderAnimation = async () => {
    if (!editId) {
      toast.error('Save the signature first, then render the animation')
      return
    }
    setRendering(true)
    try {
      const { data } = await outreachApi.renderAnimatedSignature(editId, {
        animationStyle: config.animationStyle || 'fade-in',
        config, // send full current editor config so render uses live values
      })
      const url = data.animatedUrl
      // Append cache buster so browser fetches the new render
      const cacheBusted = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`
      updateConfig('animatedGifUrl', url) // store clean URL
      setAnimatedGifUrl(cacheBusted) // display with cache buster
      toast.success('Animation rendered successfully')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to render animation')
    } finally {
      setRendering(false)
    }
  }

  if (loading) {
    return <OutreachLoading />
  }

  const isStandard = config.mode === 'standard'

  return (
    <div className="p-6 space-y-6">
      {/* Google Fonts for font picker preview */}
      <style>{`@import url('${GOOGLE_FONTS_IMPORT_URL}');`}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">
              {editId ? 'Edit Signature' : 'New Signature'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isStandard
                ? 'Design an HTML email signature with live preview'
                : 'Create an animated GIF signature'}
            </p>
          </div>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => updateConfig('mode', 'standard')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isStandard
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Standard
        </button>
        <button
          onClick={() => updateConfig('mode', 'animated')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            !isStandard
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Animated
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column — form fields */}
        <div className="lg:col-span-3 space-y-6">
          {/* Signature Name */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="signatureName">Signature Name</Label>
                <Input
                  id="signatureName"
                  placeholder="e.g. My Signature, Sales Team"
                  value={config.signatureName}
                  onChange={(e) => updateConfig('signatureName', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Internal label to identify this signature</p>
              </div>
            </CardContent>
          </Card>

          {/* Person Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Person Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={config.name}
                    onChange={(e) => updateConfig('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title / Role</Label>
                  <Input
                    id="title"
                    placeholder="Founder & CEO"
                    value={config.title}
                    onChange={(e) => updateConfig('title', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Acme Inc."
                  value={config.company}
                  onChange={(e) => updateConfig('company', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@acme.com"
                    value={config.email}
                    onChange={(e) => updateConfig('email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="(555) 123-4567"
                    value={config.phone}
                    onChange={(e) => updateConfig('phone', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="https://acme.com"
                  value={config.website}
                  onChange={(e) => updateConfig('website', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Image */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="h-4 w-4" />
                Image
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {IMAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setImageSource(opt.value)
                      if (opt.value === '') {
                        updateConfig('imageUrl', '')
                      } else if (opt.value === 'logo') {
                        const logoUrl = currentProject?.logo_url || currentProject?.favicon_url || ''
                        if (logoUrl) {
                          updateConfig('imageUrl', logoUrl)
                          updateConfig('imageShape', 'square')
                        }
                      } else if (opt.value === 'profile') {
                        const avatarUrl = user?.avatar || user?.avatar_url || ''
                        if (avatarUrl) {
                          updateConfig('imageUrl', avatarUrl)
                          updateConfig('imageShape', 'circle')
                        }
                      }
                    }}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                      imageSource === opt.value
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {(imageSource === 'custom' || imageSource === 'logo' || imageSource === 'profile') && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Input
                      placeholder="Image URL"
                      value={config.imageUrl}
                      onChange={(e) => updateConfig('imageUrl', e.target.value)}
                      className="flex-1"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'image')}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadFile.isPending}
                      className="gap-2 shrink-0"
                    >
                      {uploadFile.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Upload
                    </Button>
                  </div>

                  {config.imageUrl && (
                    <div className="flex items-center gap-3">
                      <img
                        src={config.imageUrl}
                        alt="Preview"
                        className={`h-12 max-w-[140px] w-auto object-contain bg-muted/40 ${
                          config.imageShape === 'circle' ? 'rounded-full' : 'rounded'
                        }`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateConfig('imageUrl', '')}
                        className="text-destructive text-xs"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {imageSource && imageSource !== '' && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Image Shape</Label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateConfig('imageShape', 'circle')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        config.imageShape === 'circle'
                          ? 'border-primary bg-primary/5 text-primary font-medium'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      <Circle className="h-4 w-4" />
                      Circle
                    </button>
                    <button
                      onClick={() => updateConfig('imageShape', 'square')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        config.imageShape === 'square'
                          ? 'border-primary bg-primary/5 text-primary font-medium'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      <Square className="h-4 w-4" />
                      Square
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Brand Color / Text Color */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                {isStandard ? 'Brand Color' : 'Colors'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brandColor" className="text-xs">Brand Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="brandColor"
                      type="color"
                      value={config.brandColor}
                      onChange={(e) => updateConfig('brandColor', e.target.value)}
                      className="h-9 w-12 rounded border border-border cursor-pointer"
                    />
                    <Input
                      value={config.brandColor}
                      onChange={(e) => updateConfig('brandColor', e.target.value)}
                      className="w-28 font-mono text-sm"
                    />
                  </div>
                </div>

                {!isStandard && (
                  <div className="space-y-2">
                    <Label htmlFor="textColor" className="text-xs">Text Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="textColor"
                        type="color"
                        value={config.textColor}
                        onChange={(e) => updateConfig('textColor', e.target.value)}
                        className="h-9 w-12 rounded border border-border cursor-pointer"
                      />
                      <Input
                        value={config.textColor}
                        onChange={(e) => updateConfig('textColor', e.target.value)}
                        className="w-28 font-mono text-sm"
                      />
                    </div>
                    {!isStandard && (
                      <div className="mt-4">
                        <Label className="text-sm mb-2 block">Background</Label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateConfig('bgColor', 'light')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
                              config.bgColor !== 'dark'
                                ? 'border-[var(--brand-primary)] bg-white text-gray-900 font-medium'
                                : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50'
                            }`}
                          >
                            <Sun className="h-3.5 w-3.5" /> Light
                          </button>
                          <button
                            onClick={() => updateConfig('bgColor', 'dark')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
                              config.bgColor === 'dark'
                                ? 'border-[var(--brand-primary)] bg-gray-900 text-white font-medium'
                                : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50'
                            }`}
                          >
                            <Moon className="h-3.5 w-3.5" /> Dark
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          GIF background color — pick the one that matches your recipients' email theme
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Font Picker (both modes) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Type className="h-4 w-4" />
                Font
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {FONT_OPTIONS.map(({ value, label, category }) => (
                  <button
                    key={value}
                    onClick={() => updateConfig('font', value)}
                    className={`flex flex-col items-start px-3 py-2 rounded-lg border-2 text-left transition-colors ${
                      config.font === value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span
                      className="text-sm font-medium truncate w-full"
                      style={{ fontFamily: `'${value}', sans-serif` }}
                    >
                      {label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{category}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Standard-only sections */}
          {isStandard && (
            <>
              {/* Template Picker */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Template
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(SIGNATURE_TEMPLATES).map(([key, tmpl]) => {
                      const previewConfig = { ...config, template: key }
                      const miniHtml = renderSignature(previewConfig)
                      return (
                        <button
                          key={key}
                          onClick={() => updateConfig('template', key)}
                          className={`relative flex flex-col rounded-lg border-2 p-3 text-left transition-colors ${
                            config.template === key
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div
                            className="w-full overflow-hidden rounded bg-white mb-2"
                            style={{ height: 80, pointerEvents: 'none' }}
                          >
                            <div
                              className="origin-top-left"
                              style={{ transform: 'scale(0.35)', transformOrigin: 'top left', width: '285%' }}
                              dangerouslySetInnerHTML={{ __html: miniHtml }}
                            />
                          </div>
                          <span className="text-sm font-medium">{tmpl.name}</span>
                          <span className="text-xs text-muted-foreground line-clamp-2">
                            {tmpl.description}
                          </span>
                          {config.template === key && (
                            <Badge className="absolute top-2 right-2 text-[10px]">Active</Badge>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Social Links (collapsible) */}
              <Card>
                <CardHeader
                  className="pb-3 cursor-pointer select-none"
                  onClick={() => setShowSocials(!showSocials)}
                >
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4" />
                      Social Links
                    </span>
                    {showSocials ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardTitle>
                </CardHeader>
                {showSocials && (
                  <CardContent className="space-y-3">
                    {[
                      { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'linkedin.com/in/johndoe or johndoe' },
                      { key: 'twitter', label: 'Twitter / X', icon: Twitter, placeholder: 'x.com/johndoe or @johndoe' },
                      { key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: '@johndoe or johndoe' },
                      { key: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'facebook.com/johndoe or johndoe' },
                    ].map(({ key, label, icon: Icon, placeholder }) => (
                      <div key={key} className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">{label}</Label>
                          <Input
                            placeholder={placeholder}
                            value={config.socials[key] || ''}
                            onChange={(e) => updateNested('socials', key, e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>

              {/* Booking CTA (collapsible with toggle) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span
                      className="flex items-center gap-2 cursor-pointer select-none"
                      onClick={() => setShowBookingCta(!showBookingCta)}
                    >
                      <Link2 className="h-4 w-4" />
                      Booking CTA
                      {showBookingCta ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    <Switch
                      checked={showBookingCta}
                      onCheckedChange={setShowBookingCta}
                    />
                  </CardTitle>
                </CardHeader>
                {showBookingCta && (
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label>CTA Label</Label>
                      <Input
                        placeholder="Book a Call"
                        value={config.bookingCta.label}
                        onChange={(e) => updateNested('bookingCta', 'label', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CTA URL</Label>
                      <Input
                        placeholder="https://calendly.com/johndoe"
                        value={config.bookingCta.url}
                        onChange={(e) => updateNested('bookingCta', 'url', e.target.value)}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* A/B Test CTA (collapsible with toggle) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span
                      className="flex items-center gap-2 cursor-pointer select-none"
                      onClick={() => setShowAbTest(!showAbTest)}
                    >
                      <FlaskConical className="h-4 w-4" />
                      A/B Test
                      {showAbTest ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    <Switch
                      checked={config.abTest.enabled}
                      onCheckedChange={(checked) => {
                        setConfig((prev) => ({
                          ...prev,
                          abTest: { ...prev.abTest, enabled: checked },
                        }))
                        if (checked) setShowAbTest(true)
                      }}
                    />
                  </CardTitle>
                </CardHeader>
                {showAbTest && (
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Variant A</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">CTA Label</Label>
                          <Input
                            placeholder="Schedule a Call"
                            value={config.abTest.variantA.ctaLabel}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                abTest: {
                                  ...prev.abTest,
                                  variantA: { ...prev.abTest.variantA, ctaLabel: e.target.value },
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">CTA URL</Label>
                          <Input
                            placeholder="https://calendly.com/..."
                            value={config.abTest.variantA.ctaUrl}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                abTest: {
                                  ...prev.abTest,
                                  variantA: { ...prev.abTest.variantA, ctaUrl: e.target.value },
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Variant B</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">CTA Label</Label>
                          <Input
                            placeholder="Book a Demo"
                            value={config.abTest.variantB.ctaLabel}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                abTest: {
                                  ...prev.abTest,
                                  variantB: { ...prev.abTest.variantB, ctaLabel: e.target.value },
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">CTA URL</Label>
                          <Input
                            placeholder="https://calendly.com/..."
                            value={config.abTest.variantB.ctaUrl}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                abTest: {
                                  ...prev.abTest,
                                  variantB: { ...prev.abTest.variantB, ctaUrl: e.target.value },
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Variants will alternate per email send. Track results in Signature Analytics.
                    </p>
                  </CardContent>
                )}
              </Card>

              {/* Promo Banner (collapsible with toggle) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span
                      className="flex items-center gap-2 cursor-pointer select-none"
                      onClick={() => setShowPromoBanner(!showPromoBanner)}
                    >
                      <Sparkles className="h-4 w-4" />
                      Promo Banner
                      {showPromoBanner ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    <Switch
                      checked={config.promoBanner.active}
                      onCheckedChange={(checked) => {
                        updateNested('promoBanner', 'active', checked)
                        if (checked) setShowPromoBanner(true)
                      }}
                    />
                  </CardTitle>
                </CardHeader>
                {showPromoBanner && (
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label>Banner Image</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          placeholder="Banner image URL"
                          value={config.promoBanner.imageUrl}
                          onChange={(e) => updateNested('promoBanner', 'imageUrl', e.target.value)}
                          className="flex-1"
                        />
                        <input
                          ref={bannerFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, 'banner')}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => bannerFileInputRef.current?.click()}
                          disabled={uploadFile.isPending}
                          className="gap-2 shrink-0"
                        >
                          {uploadFile.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          Upload
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Link URL</Label>
                      <Input
                        placeholder="https://acme.com/promo"
                        value={config.promoBanner.linkUrl}
                        onChange={(e) => updateNested('promoBanner', 'linkUrl', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Alt Text</Label>
                      <Input
                        placeholder="Spring promotion banner"
                        value={config.promoBanner.altText}
                        onChange={(e) => updateNested('promoBanner', 'altText', e.target.value)}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            </>
          )}

          {/* Animated-only sections */}
          {!isStandard && (
            <>
              {/* Animated Template Picker */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Animated Template
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {ANIMATED_TEMPLATES.map(({ value, label, description }) => (
                      <button
                        key={value}
                        onClick={() => updateConfig('animatedTemplate', value)}
                        className={`relative flex flex-col rounded-lg border-2 p-3 text-left transition-colors ${
                          config.animatedTemplate === value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {/* Mini CSS preview */}
                        <div
                          className="w-full rounded mb-3 overflow-hidden"
                          style={{ height: 90, pointerEvents: 'none' }}
                        >
                          {value === 'clean' && (
                            <div className="flex items-start gap-3 p-3" style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%' }}>
                              <div className="w-12 h-12 rounded-full shrink-0" style={{ background: config.brandColor }} />
                              <div className="space-y-1.5 pt-1">
                                <div className="h-3 w-24 rounded" style={{ background: config.textColor || '#333' }} />
                                <div className="h-[2px] w-28 rounded" style={{ background: config.brandColor }} />
                                <div className="h-2 w-20 rounded" style={{ background: config.brandColor, opacity: 0.6 }} />
                                <div className="h-1.5 w-32 rounded bg-gray-300" />
                              </div>
                            </div>
                          )}
                          {value === 'executive' && (
                            <div className="flex flex-col items-center justify-center h-full p-3">
                              <div className="h-4 w-28 rounded mb-1.5" style={{ background: config.textColor || '#333' }} />
                              <div className="h-[2px] w-20 mb-1.5" style={{ background: config.brandColor }} />
                              <div className="h-2 w-16 rounded mb-1" style={{ background: config.brandColor, opacity: 0.6 }} />
                              <div className="h-1.5 w-24 rounded bg-gray-300" />
                            </div>
                          )}
                          {value === 'bold' && (
                            <div className="flex h-full rounded" style={{ background: '#1a1a2e' }}>
                              <div className="w-1.5 shrink-0 rounded-l" style={{ background: config.brandColor }} />
                              <div className="p-3 space-y-1.5" style={{ transform: 'scale(0.8)', transformOrigin: 'top left' }}>
                                <div className="h-3 w-24 rounded bg-white/90" />
                                <div className="h-2 w-18 rounded bg-white/40" />
                                <div className="h-1.5 w-20 rounded bg-white/20" />
                                <div className="h-1.5 w-28 rounded bg-white/15 mt-1" />
                              </div>
                            </div>
                          )}
                          {value === 'creative' && (
                            <div className="p-3 space-y-1.5" style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%' }}>
                              <div className="h-4 w-28 rounded" style={{ background: config.textColor || '#333' }} />
                              <div className="flex gap-1.5 items-center">
                                <div className="h-1.5 w-14 rounded" style={{ background: config.brandColor }} />
                                <div className="h-1.5 w-[2px] rounded bg-gray-400" />
                                <div className="h-1.5 w-12 rounded bg-gray-300" />
                              </div>
                              <div className="flex gap-1.5 mt-2">
                                {[1,2,3].map(i => <div key={i} className="h-3 w-3 rounded-full bg-gray-300" />)}
                              </div>
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground">{description}</span>
                        {config.animatedTemplate === value && (
                          <Badge className="absolute top-2 right-2 text-[10px]">Active</Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Animation Style */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Animation Style
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {ANIMATION_STYLES.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => updateConfig('animationStyle', value)}
                        className={`px-4 py-2 rounded-md text-sm border transition-colors ${
                          config.animationStyle === value
                            ? 'border-primary bg-primary/5 text-primary font-medium'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Link URL */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="linkUrl">Link URL</Label>
                    <Input
                      id="linkUrl"
                      placeholder={config.website || 'https://acme.com'}
                      value={config.linkUrl}
                      onChange={(e) => updateConfig('linkUrl', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Where the animated signature links to when clicked
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Right column — preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {/* Expand button */}
                    <button
                      onClick={() => setShowExpandedPreview(true)}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title="Expand preview"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Email bg</span>
                      <div className="flex gap-1 bg-muted p-0.5 rounded-md">
                        <button
                          onClick={() => setPreviewBg('light')}
                          className={`p-1.5 rounded ${
                            previewBg === 'light' ? 'bg-background shadow-sm' : ''
                          }`}
                          title="Preview on light email background"
                        >
                          <Sun className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setPreviewBg('dark')}
                          className={`p-1.5 rounded ${
                            previewBg === 'dark' ? 'bg-background shadow-sm' : ''
                          }`}
                          title="Preview on dark email background"
                        >
                          <Moon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className={`rounded-lg border p-6 transition-colors ${
                    previewBg === 'dark' ? 'bg-gray-900' : 'bg-white'
                  }`}
                >
                  {isStandard ? (
                    config.name ? (
                      <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Fill in details to see your signature
                      </p>
                    )
                  ) : animatedGifUrl ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80px' }}>
                      <img
                        src={animatedGifUrl}
                        alt="Animated signature preview"
                        style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                        key={animatedGifUrl}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-2">
                      <Sparkles className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        Click "Render Animation" to generate preview
                      </p>
                    </div>
                  )}
                </div>
                {/* Replay button for animated */}
                {!isStandard && animatedGifUrl && (
                  <button
                    onClick={() => {
                      // Force re-mount by cycling the URL
                      const base = animatedGifUrl.split('?')[0]
                      setAnimatedGifUrl(`${base}?t=${Date.now()}`)
                    }}
                    className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Replay animation
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Email client compatibility preview */}
            {isStandard && (
              <EmailClientPreview html={renderedHtml} />
            )}
          </div>
        </div>

        {/* Expanded preview modal */}
        {showExpandedPreview && (
          <Dialog open={showExpandedPreview} onOpenChange={setShowExpandedPreview}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Signature Preview — As seen in email
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Mock email context */}
                <div className="rounded-lg border bg-white text-black overflow-hidden">
                  {/* Email header mock */}
                  <div className="border-b px-6 py-3 bg-gray-50 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-500 w-12">From:</span>
                      <span>{config.name} &lt;{config.email || 'you@company.com'}&gt;</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-500 w-12">To:</span>
                      <span className="text-gray-400">recipient@example.com</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-500 w-12">Subject:</span>
                      <span>Re: Quick follow up</span>
                    </div>
                  </div>
                  {/* Email body mock */}
                  <div className="px-6 py-4 space-y-4">
                    <div className="text-sm text-gray-700 space-y-2">
                      <p>Hi there,</p>
                      <p>Thanks for getting back to me. I'd love to set up a quick call this week to discuss further.</p>
                      <p>Best,</p>
                    </div>
                    {/* Signature */}
                    <div className="pt-2 border-t border-gray-200">
                      {isStandard ? (
                        <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
                      ) : animatedGifUrl ? (
                        <img
                          src={`${animatedGifUrl.split('?')[0]}?t=${Date.now()}`}
                          alt="Animated signature"
                          style={{ maxWidth: 480, display: 'block' }}
                          key={`expanded-${Date.now()}`}
                        />
                      ) : (
                        <p className="text-sm text-gray-400 italic">No animation rendered yet</p>
                      )}
                    </div>
                  </div>
                </div>
                {/* Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 bg-muted p-0.5 rounded-md">
                    <button
                      onClick={() => setPreviewBg('light')}
                      className={`px-3 py-1.5 rounded text-xs ${
                        previewBg === 'light' ? 'bg-background shadow-sm' : ''
                      }`}
                    >
                      Light
                    </button>
                    <button
                      onClick={() => setPreviewBg('dark')}
                      className={`px-3 py-1.5 rounded text-xs ${
                        previewBg === 'dark' ? 'bg-background shadow-sm' : ''
                      }`}
                    >
                      Dark
                    </button>
                  </div>
                  {!isStandard && animatedGifUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const base = animatedGifUrl.split('?')[0]
                        setAnimatedGifUrl(`${base}?t=${Date.now()}`)
                      }}
                      className="gap-1"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Replay
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Action bar */}
      <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur border-t -mx-6 px-6 py-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            {!isStandard && (
              <Button variant="outline" onClick={handleRenderAnimation} disabled={rendering} className="gap-2">
                {rendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {rendering ? 'Rendering...' : 'Render Animation'}
              </Button>
            )}
            <Button variant="outline" onClick={handleCopy} disabled={copying} className="gap-2">
              {copying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy to Clipboard
            </Button>
            <Button variant="outline" onClick={handleApplyGmail} disabled={applyingGmail} className="gap-2">
              {applyingGmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Apply to Gmail
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
