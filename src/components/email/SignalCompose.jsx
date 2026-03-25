/**
 * SignalCompose — Multi-step modal for creating marketing emails with Signal AI.
 *
 * Steps:
 *   1. Describe Your Vision (prompt + tone + quick starts + optional offering)
 *   2. Visual Assets (image uploads + brand color + signature toggle)
 *   3. Generating... (SonorSpinner + animated progress steps)
 *   4. Preview & Edit (iframe preview + subject variants + section editing)
 *
 * Design: Liquid Glass system, SonorSpinner, CSS variables throughout.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card'
import { SonorSpinner } from '@/components/SonorLoading'
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Upload,
  X,
  Image as ImageIcon,
  Sun,
  Moon,
  Copy,
  Send,
  Save,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Circle,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import useAuthStore from '@/lib/auth-store'
import { useEmailPlatformStore } from '@/lib/email-platform-store'
import { emailApi, commerceApi, outreachApi } from '@/lib/sonor-api'
import { useUploadFile } from '@/lib/hooks/use-files'

// ─── Constants ─────────────────────────────────────────────────────────────

const QUICK_STARTS = [
  'Product launch announcement',
  'Monthly newsletter',
  'Flash sale / promotion',
  'Event invitation',
  'Customer re-engagement',
  'Company update',
]

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'playful', label: 'Playful' },
  { value: 'luxurious', label: 'Luxurious' },
]

const IMAGE_LABELS = [
  'Hero image',
  'Product shot',
  'Team photo',
  'Logo',
  'Supporting image',
]

const SECTION_TYPES = [
  'Testimonial',
  'Features',
  'Stats',
  'Image',
  'Divider',
]

const GENERATION_STEPS = [
  'Analyzing your brand context',
  'Selecting optimal template structure',
  'Generating content...',
  'Building responsive HTML',
  'Generating subject line variants',
]

const MAX_IMAGES = 5

// ─── Component ─────────────────────────────────────────────────────────────

export default function SignalCompose({
  open,
  onOpenChange,
  onCreateCampaign,
  onOpenInEditor,
  initialDescription = '',
}) {
  const { currentProject, currentOrg, user } = useAuthStore()
  const { createTemplate } = useEmailPlatformStore()
  const uploadFile = useUploadFile()

  // ── Step state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState(0)

  // ── Step 1: Vision ─────────────────────────────────────────────────────
  const [description, setDescription] = useState(initialDescription)
  const [tone, setTone] = useState('professional')
  const [offeringId, setOfferingId] = useState(null)
  const [offerings, setOfferings] = useState([])
  const [offeringsLoading, setOfferingsLoading] = useState(false)

  // ── Step 2: Assets ─────────────────────────────────────────────────────
  const [images, setImages] = useState([]) // { file, preview, label, uploading, url }
  const [brandColor, setBrandColor] = useState(
    currentProject?.brand_primary || currentOrg?.theme?.primaryColor || '#39bfb0'
  )
  const [includeSignature, setIncludeSignature] = useState(false)
  const [signatureHtml, setSignatureHtml] = useState(null)
  const fileInputRef = useRef(null)

  // ── Step 3: Generating ─────────────────────────────────────────────────
  const [generationStep, setGenerationStep] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState(null)

  // ── Step 4: Preview & Edit ─────────────────────────────────────────────
  const [result, setResult] = useState(null) // { html, subject, previewText, subjectVariants, sections }
  const [subject, setSubject] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [html, setHtml] = useState('')
  const [sections, setSections] = useState([])
  const [darkPreview, setDarkPreview] = useState(false)
  const [editingSection, setEditingSection] = useState(null)
  const [sectionEditText, setSectionEditText] = useState('')
  const [sectionRewriting, setSectionRewriting] = useState(false)
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)

  const iframeRef = useRef(null)

  // ── Reset on open ──────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setStep(0)
      setDescription(initialDescription)
      setTone('professional')
      setOfferingId(null)
      setImages([])
      setBrandColor(currentProject?.brand_primary || currentOrg?.theme?.primaryColor || '#39bfb0')
      setIncludeSignature(false)
      setSignatureHtml(null)
      setResult(null)
      setSubject('')
      setPreviewText('')
      setHtml('')
      setSections([])
      setGenerateError(null)
      setGenerationStep(0)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch offerings ────────────────────────────────────────────────────
  useEffect(() => {
    if (open && currentProject?.id) {
      setOfferingsLoading(true)
      commerceApi.getOfferings(currentProject.id)
        .then(res => {
          const data = res.data || res
          setOfferings(data.offerings || data || [])
        })
        .catch(() => setOfferings([]))
        .finally(() => setOfferingsLoading(false))
    }
  }, [open, currentProject?.id])

  // ── Fetch default signature when toggle is turned on ───────────────────
  useEffect(() => {
    if (includeSignature && !signatureHtml) {
      outreachApi.getSignatures()
        .then(res => {
          const data = res.data || res
          const sigs = data.signatures || data || []
          if (sigs.length > 0) {
            // Use the first (default) signature's rendered HTML
            setSignatureHtml(sigs[0].html || sigs[0].rendered_html || null)
          }
        })
        .catch(() => {
          toast.error('Could not load signatures')
          setIncludeSignature(false)
        })
    }
  }, [includeSignature]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Image handling ─────────────────────────────────────────────────────
  const handleImageDrop = useCallback((e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'))
    addImages(files)
  }, [images.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleImageSelect = useCallback((e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'))
    addImages(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [images.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const addImages = (files) => {
    const remaining = MAX_IMAGES - images.length
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed`)
      return
    }
    const toAdd = files.slice(0, remaining)
    const newImages = toAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      label: 'Supporting image',
      uploading: false,
      url: null,
    }))
    setImages(prev => [...prev, ...newImages])
  }

  const removeImage = (index) => {
    setImages(prev => {
      const updated = [...prev]
      if (updated[index]?.preview) URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
  }

  const updateImageLabel = (index, label) => {
    setImages(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], label }
      return updated
    })
  }

  // ── Upload images to storage before generation ─────────────────────────
  const uploadImages = async () => {
    if (!currentProject?.id) return []
    const uploaded = []
    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      if (img.url) {
        uploaded.push({ url: img.url, label: img.label })
        continue
      }
      try {
        const result = await uploadFile.mutateAsync({
          projectId: currentProject.id,
          file: img.file,
          category: 'email',
          isPublic: true,
        })
        const url = result.publicUrl || result.public_url || result.url
        uploaded.push({ url, label: img.label })
        setImages(prev => {
          const updated = [...prev]
          updated[i] = { ...updated[i], url, uploading: false }
          return updated
        })
      } catch {
        toast.error(`Failed to upload ${img.file.name}`)
      }
    }
    return uploaded
  }

  // ── Generation ─────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    setStep(2)
    setIsGenerating(true)
    setGenerateError(null)
    setGenerationStep(0)

    // Animate through generation steps
    const stepInterval = setInterval(() => {
      setGenerationStep(prev => {
        if (prev < GENERATION_STEPS.length - 1) return prev + 1
        return prev
      })
    }, 1800)

    try {
      // Upload images first
      const uploadedImages = await uploadImages()

      const payload = {
        description,
        tone,
        images: uploadedImages,
        brandColor,
        offering: offeringId || undefined,
        signatureHtml: includeSignature ? signatureHtml : undefined,
      }

      const res = await emailApi.composeWithSignal(payload)
      const data = res.data || res

      clearInterval(stepInterval)
      setGenerationStep(GENERATION_STEPS.length)

      setResult(data)
      setSubject(data.subject || '')
      setPreviewText(data.previewText || data.preview_text || '')
      setHtml(data.html || '')
      setSections(data.sections || [])

      // Brief pause to show completion state, then advance
      setTimeout(() => setStep(3), 600)
    } catch (err) {
      clearInterval(stepInterval)
      setGenerateError(err.message || 'Generation failed')
      toast.error(err.message || 'Failed to generate email')
      setIsGenerating(false)
    }
  }

  const handleRetry = () => {
    handleGenerate()
  }

  // ── Section editing ────────────────────────────────────────────────────
  const handleEditSection = (index) => {
    setEditingSection(index)
    setSectionEditText(sections[index]?.content || '')
  }

  const handleSaveSectionEdit = async (index) => {
    if (!sectionEditText.trim()) return
    setSectionRewriting(true)
    try {
      // Call Signal to rewrite just this section
      const res = await emailApi.composeWithSignal({
        description: sectionEditText,
        tone,
        brandColor,
        rewriteSection: {
          index,
          type: sections[index]?.type,
          currentHtml: html,
        },
      })
      const data = res.data || res
      if (data.html) setHtml(data.html)
      if (data.sections) setSections(data.sections)
      setEditingSection(null)
      setSectionEditText('')
      toast.success('Section updated')
    } catch {
      toast.error('Failed to rewrite section')
    } finally {
      setSectionRewriting(false)
    }
  }

  const handleRemoveSection = (index) => {
    const updated = sections.filter((_, i) => i !== index)
    setSections(updated)
    // In a real implementation, the backend would also rebuild the HTML
    toast.success('Section removed')
  }

  const handleAddSection = async (type) => {
    try {
      const res = await emailApi.composeWithSignal({
        description: `Add a ${type} section`,
        tone,
        brandColor,
        addSection: { type, currentHtml: html },
      })
      const data = res.data || res
      if (data.html) setHtml(data.html)
      if (data.sections) setSections(data.sections)
      toast.success(`${type} section added`)
    } catch {
      toast.error('Failed to add section')
    }
  }

  const handleRegenerateAll = () => {
    setStep(2)
    handleGenerate()
  }

  // ── Actions ────────────────────────────────────────────────────────────
  const handleCreateCampaign = () => {
    if (onCreateCampaign) {
      onCreateCampaign({ html, subject, previewText })
    }
    // Parent handles closing the dialog when onCreateCampaign is called
  }

  const handleSaveAsTemplate = async () => {
    setIsSavingTemplate(true)
    try {
      await createTemplate({ name: subject || 'Signal Generated Template', html, category: 'custom' })
      toast.success('Saved as template')
    } catch {
      toast.error('Failed to save template')
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const handleSendTest = async () => {
    const userEmail = user?.email
    if (!userEmail) {
      toast.error('No email address found')
      return
    }
    setIsSendingTest(true)
    try {
      await emailApi.sendTest({ html, subject, to: userEmail })
      toast.success(`Test email sent to ${userEmail}`)
    } catch {
      toast.error('Failed to send test email')
    } finally {
      setIsSendingTest(false)
    }
  }

  const [isRegeneratingVariants, setIsRegeneratingVariants] = useState(false)

  const handleMoreVariants = async () => {
    setIsRegeneratingVariants(true)
    try {
      const res = await emailApi.composeWithSignal({
        regenerateSubjects: true,
        currentSubject: subject,
        description,
        tone,
        brandColor,
      })
      const data = res.data || res
      if (data.subjectVariants || data.subject_variants) {
        const newVariants = data.subjectVariants || data.subject_variants || []
        setResult(prev => ({ ...prev, subjectVariants: newVariants }))
      }
      toast.success('New variants generated')
    } catch {
      toast.error('Failed to generate variants')
    } finally {
      setIsRegeneratingVariants(false)
    }
  }

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(html)
    toast.success('HTML copied to clipboard')
  }

  // ── Navigation ─────────────────────────────────────────────────────────
  const canProceedStep1 = description.trim().length > 10
  const canProceedStep2 = true // all optional

  const handleNext = () => {
    if (step === 0 && canProceedStep1) setStep(1)
    else if (step === 1) handleGenerate()
  }

  const handleBack = () => {
    if (step === 1) setStep(0)
    else if (step === 3) setStep(1) // back to assets from preview
  }

  // ── Update iframe when html changes ────────────────────────────────────
  useEffect(() => {
    if (step === 3 && iframeRef.current && html) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(html)
        doc.close()
      }
    }
  }, [step, html, darkPreview])

  // ── Subject variants from result ───────────────────────────────────────
  const subjectVariants = useMemo(() => {
    if (!result) return []
    return result.subjectVariants || result.subject_variants || []
  }, [result])

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* ── Step 1: Describe Your Vision ───────────────────────────────── */}
        {step === 0 && (
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Create with Signal</h2>
                <p className="text-sm text-[var(--text-secondary)]">Describe your email and Signal will craft it</p>
              </div>
            </div>

            {/* Description textarea */}
            <div>
              <Label className="text-sm font-medium text-[var(--text-primary)]">Describe your email</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your email — what's the message, who's it for, what do you want them to do?"
                className="mt-2 min-h-[120px] resize-none"
                rows={5}
              />
            </div>

            {/* Quick start chips */}
            <div>
              <Label className="text-sm font-medium text-[var(--text-secondary)]">Quick start</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {QUICK_STARTS.map((qs) => (
                  <button
                    key={qs}
                    onClick={() => setDescription(qs)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm transition-all duration-200',
                      'border border-[var(--glass-border)]',
                      'hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10',
                      'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                      description === qs && 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--text-primary)]'
                    )}
                  >
                    {qs}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone selector */}
            <div>
              <Label className="text-sm font-medium text-[var(--text-primary)]">Tone</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      'border',
                      tone === t.value
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                        : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--glass-border-strong)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional: Link offering */}
            {offerings.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-[var(--text-primary)]">Link to Offering (Optional)</Label>
                <Select value={offeringId || ''} onValueChange={(v) => setOfferingId(v || null)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select an offering..." />
                  </SelectTrigger>
                  <SelectContent>
                    {offerings.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        <span className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs capitalize">{o.type}</Badge>
                          {o.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end pt-2">
              <Button onClick={handleNext} disabled={!canProceedStep1} className="gap-2">
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Visual Assets ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Visual Assets</h2>
                <p className="text-sm text-[var(--text-secondary)]">Add images and brand elements for your email</p>
              </div>
            </div>

            {/* Image drop zone */}
            <GlassCard>
              <GlassCardContent className="p-6">
                <div
                  onDrop={handleImageDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
                    'border-[var(--glass-border)] hover:border-[var(--brand-primary)]',
                    'hover:bg-[var(--brand-primary)]/5',
                    images.length >= MAX_IMAGES && 'opacity-50 pointer-events-none'
                  )}
                >
                  <Upload className="h-8 w-8 mx-auto text-[var(--text-tertiary)] mb-3" />
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Drop images here or click to upload
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    {images.length}/{MAX_IMAGES} images
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>

                {/* Uploaded images grid */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                    {images.map((img, idx) => (
                      <GlassCard key={idx} variant="inset" className="relative overflow-hidden">
                        <img
                          src={img.preview}
                          alt={img.label}
                          className="w-full h-24 object-cover rounded-t-[var(--radius-xl)]"
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); removeImage(idx) }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                        >
                          <X className="h-3.5 w-3.5 text-white" />
                        </button>
                        <div className="p-2">
                          <Select
                            value={img.label}
                            onValueChange={(v) => updateImageLabel(idx, v)}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {IMAGE_LABELS.map((label) => (
                                <SelectItem key={label} value={label} className="text-xs">
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </GlassCardContent>
            </GlassCard>

            {/* Brand color picker */}
            <GlassCard>
              <GlassCardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Label className="text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">
                    Brand Color
                  </Label>
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-[var(--glass-border)] cursor-pointer"
                    />
                    <Input
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      placeholder="#39bfb0"
                      className="w-32 font-mono text-sm"
                    />
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>

            {/* Signature toggle */}
            <GlassCard>
              <GlassCardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-[var(--text-primary)]">
                      Include email signature
                    </Label>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Uses your default outreach signature
                    </p>
                  </div>
                  <Switch
                    checked={includeSignature}
                    onCheckedChange={setIncludeSignature}
                  />
                </div>
              </GlassCardContent>
            </GlassCard>

            {/* Footer */}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={handleBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Generate Email
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Generating ────────────────────────────────────────── */}
        {step === 2 && (
          <div className="p-6 flex flex-col items-center justify-center min-h-[400px] space-y-8">
            {generateError ? (
              <>
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
                    <X className="h-6 w-6 text-red-500" />
                  </div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Generation failed</p>
                  <p className="text-xs text-[var(--text-secondary)]">{generateError}</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={handleRetry} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                </div>
              </>
            ) : (
              <>
                <SonorSpinner size="lg" label="Signal is crafting your email..." />

                <div className="w-full max-w-sm space-y-3">
                  {GENERATION_STEPS.map((label, idx) => {
                    const isComplete = idx < generationStep
                    const isCurrent = idx === generationStep
                    return (
                      <div key={label} className="flex items-center gap-3">
                        {isComplete ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : isCurrent ? (
                          <SonorSpinner size="sm" className="shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-[var(--text-tertiary)] shrink-0" />
                        )}
                        <span
                          className={cn(
                            'text-sm',
                            isComplete && 'text-[var(--text-secondary)]',
                            isCurrent && 'text-[var(--text-primary)] font-medium',
                            !isComplete && !isCurrent && 'text-[var(--text-tertiary)]'
                          )}
                        >
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 4: Preview & Edit ────────────────────────────────────── */}
        {step === 3 && (
          <div className="flex flex-col max-h-[85vh]">
            {/* Two-column layout */}
            <div className="flex flex-1 min-h-0">
              {/* Preview (left, ~60%) */}
              <div className="w-[60%] border-r border-[var(--glass-border)] flex flex-col">
                <div className="flex items-center justify-between p-3 border-b border-[var(--glass-border)]">
                  <span className="text-sm font-medium text-[var(--text-primary)]">Preview</span>
                  <button
                    onClick={() => setDarkPreview(!darkPreview)}
                    className="p-1.5 rounded-lg hover:bg-[var(--glass-bg)] transition-colors"
                    title={darkPreview ? 'Light background' : 'Dark background'}
                  >
                    {darkPreview ? (
                      <Sun className="h-4 w-4 text-[var(--text-secondary)]" />
                    ) : (
                      <Moon className="h-4 w-4 text-[var(--text-secondary)]" />
                    )}
                  </button>
                </div>
                <div
                  className={cn(
                    'flex-1 overflow-auto flex justify-center p-4',
                    darkPreview ? 'bg-gray-900' : 'bg-gray-100'
                  )}
                >
                  <iframe
                    ref={iframeRef}
                    title="Email Preview"
                    className="bg-white rounded-lg shadow-lg border-0"
                    style={{ width: 600, minHeight: 400, maxWidth: '100%' }}
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>

              {/* Edit tools (right, ~40%) */}
              <div className="w-[40%] flex flex-col overflow-y-auto">
                <div className="p-4 space-y-5">
                  {/* Subject line */}
                  <div>
                    <Label className="text-sm font-medium text-[var(--text-primary)]">Subject Line</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="mt-1.5"
                    />
                    {subjectVariants.length > 0 && (
                      <div className="mt-2">
                        <button
                          onClick={handleMoreVariants}
                          disabled={isRegeneratingVariants}
                          className="text-xs text-[var(--brand-primary)] font-medium mb-1.5 hover:underline disabled:opacity-50"
                        >
                          {isRegeneratingVariants ? 'Generating...' : 'More variants'}
                        </button>
                        <div className="flex flex-wrap gap-1.5">
                          {subjectVariants.map((variant, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSubject(variant)}
                              className={cn(
                                'px-2.5 py-1 rounded-md text-xs transition-all duration-200',
                                'border border-[var(--glass-border)]',
                                'hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5',
                                'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                                subject === variant && 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                              )}
                            >
                              {variant}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Preview text */}
                  <div>
                    <Label className="text-sm font-medium text-[var(--text-primary)]">Preview Text</Label>
                    <Input
                      value={previewText}
                      onChange={(e) => setPreviewText(e.target.value)}
                      className="mt-1.5"
                      placeholder="Shows after the subject line"
                    />
                  </div>

                  {/* Sections list */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-[var(--text-primary)]">Sections</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                            <Plus className="h-3 w-3" />
                            Add Section
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {SECTION_TYPES.map((type) => (
                            <DropdownMenuItem key={type} onClick={() => handleAddSection(type)}>
                              {type}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2">
                      {sections.map((section, idx) => (
                        <GlassCard key={idx} variant="inset" className="p-3">
                          {editingSection === idx ? (
                            <div className="space-y-2">
                              <Textarea
                                value={sectionEditText}
                                onChange={(e) => setSectionEditText(e.target.value)}
                                placeholder="Describe the changes you want..."
                                rows={3}
                                className="text-sm"
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingSection(null)}
                                  className="h-7 text-xs"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveSectionEdit(idx)}
                                  disabled={sectionRewriting}
                                  className="h-7 text-xs gap-1"
                                >
                                  {sectionRewriting ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-3 w-3" />
                                  )}
                                  Rewrite
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <Badge variant="secondary" className="text-[10px] mb-1">
                                  {section.type || 'Content'}
                                </Badge>
                                <p className="text-xs text-[var(--text-secondary)] truncate">
                                  {section.preview || section.content?.slice(0, 60) || 'Section content'}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleEditSection(idx)}
                                  className="p-1 rounded hover:bg-[var(--glass-bg)] transition-colors"
                                  title="Edit section"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                                </button>
                                <button
                                  onClick={() => handleRemoveSection(idx)}
                                  className="p-1 rounded hover:bg-red-500/10 transition-colors"
                                  title="Remove section"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-[var(--text-tertiary)] hover:text-red-500" />
                                </button>
                              </div>
                            </div>
                          )}
                        </GlassCard>
                      ))}

                      {sections.length === 0 && (
                        <p className="text-xs text-[var(--text-tertiary)] text-center py-4">
                          No editable sections detected
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Regenerate / Open in Editor */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerateAll}
                      className="gap-1.5 flex-1"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Regenerate All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (onOpenInEditor) {
                          onOpenInEditor({ html, subject, previewText })
                        }
                        onOpenChange(false)
                      }}
                      className="gap-1.5 flex-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open in Editor
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom action bar */}
            <div className="border-t border-[var(--glass-border)] p-3 bg-[var(--glass-bg)] flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyHtml}
                  className="gap-1.5 text-[var(--text-secondary)]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy HTML
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSendTest}
                  disabled={isSendingTest}
                  className="gap-1.5 text-[var(--text-secondary)]"
                >
                  {isSendingTest ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Send Test
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveAsTemplate}
                  disabled={isSavingTemplate}
                  className="gap-1.5"
                >
                  {isSavingTemplate ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save as Template
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateCampaign}
                  className="gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Create Campaign
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
