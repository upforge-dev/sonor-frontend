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
  Monitor,
  Smartphone,
  GripVertical,
  FolderOpen,
  AlertTriangle,
  Shield,
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
import { useUploadFile, useFiles } from '@/lib/hooks/use-files'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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

const MAX_IMAGES = 10

const FONT_OPTIONS = [
  { value: "'Helvetica Neue', Helvetica, Arial, sans-serif", label: 'Helvetica (Default)' },
  { value: "Georgia, 'Times New Roman', serif", label: 'Georgia (Serif)' },
  { value: "Verdana, Geneva, sans-serif", label: 'Verdana' },
  { value: "'Trebuchet MS', 'Lucida Grande', sans-serif", label: 'Trebuchet MS' },
  { value: "'Courier New', Courier, monospace", label: 'Courier New (Mono)' },
]

// ─── Sortable Section Component ────────────────────────────────────────────

function SortableSection({
  section, idx, editingSection, sectionEditText, setSectionEditText,
  sectionRewriting, handleEditSection, handleSaveSectionEdit, handleRemoveSection,
  setEditingSection, isReordering,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  }

  return (
    <div ref={setNodeRef} style={style}>
      <GlassCard variant="inset" className={cn('p-3', isDragging && 'ring-1 ring-[var(--brand-primary)]')}>
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
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="p-0.5 rounded cursor-grab active:cursor-grabbing hover:bg-[var(--glass-bg)] transition-colors shrink-0 mt-0.5"
              title="Drag to reorder"
            >
              <GripVertical className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            </button>
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
    </div>
  )
}

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
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].value)
  const [showUtm, setShowUtm] = useState(false)
  const [utmSource, setUtmSource] = useState('email')
  const [utmMedium, setUtmMedium] = useState('newsletter')
  const [utmCampaign, setUtmCampaign] = useState('')
  const [utmContent, setUtmContent] = useState('')
  const [showLibrary, setShowLibrary] = useState(false)
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
  const [previewDevice, setPreviewDevice] = useState('desktop') // 'desktop' | 'mobile'
  const [sizeWarning, setSizeWarning] = useState(null)
  const [deliverabilityScore, setDeliverabilityScore] = useState(null)

  const iframeRef = useRef(null)

  // ── Project image library ───────────────────────────────────────────────
  const { data: projectFilesData } = useFiles(
    currentProject?.id,
    { category: 'email' },
    { enabled: !!open && !!currentProject?.id }
  )
  const projectImages = useMemo(() => {
    const files = projectFilesData?.files || projectFilesData || []
    return files
      .filter(f => f.mime_type?.startsWith('image/') || f.mimeType?.startsWith('image/'))
      .map(f => ({
        id: f.id,
        url: f.public_url || f.publicUrl || f.url,
        name: f.filename || f.name,
        thumbnail: f.public_url || f.publicUrl || f.url,
      }))
  }, [projectFilesData])

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

  // ── Add image from library (no re-upload) ──────────────────────────────
  const addLibraryImage = (libraryImage) => {
    if (images.length >= MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed`)
      return
    }
    // Check if already added
    if (images.some(img => img.url === libraryImage.url)) {
      toast.info('Image already added')
      return
    }
    setImages(prev => [...prev, {
      file: null,
      preview: libraryImage.url,
      label: 'Supporting image',
      uploading: false,
      url: libraryImage.url,
    }])
    toast.success('Image added')
  }

  // ── Compress image before upload (max 600px width, 80% quality) ───────
  const compressImage = async (file, maxWidth = 600, quality = 0.8) => {
    // Skip non-raster or small files
    if (file.type === 'image/svg+xml' || file.type === 'image/gif' || file.size < 200 * 1024) {
      return file
    }

    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        // Only resize if wider than maxWidth
        if (img.width <= maxWidth) {
          URL.revokeObjectURL(img.src)
          resolve(file)
          return
        }
        const scale = maxWidth / img.width
        const canvas = document.createElement('canvas')
        canvas.width = maxWidth
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(img.src)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => resolve(file)
      img.src = URL.createObjectURL(file)
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
        // Compress before uploading
        const compressedFile = await compressImage(img.file)
        const result = await uploadFile.mutateAsync({
          projectId: currentProject.id,
          file: compressedFile,
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

      // Build offering object if an offering is selected
      let offeringPayload = undefined
      if (offeringId) {
        const selectedOffering = offerings.find(o => o.id === offeringId)
        if (selectedOffering) {
          offeringPayload = {
            name: selectedOffering.name,
            description: selectedOffering.headline || selectedOffering.description || '',
            price: selectedOffering.price ? `$${selectedOffering.price}` : '',
            imageUrl: selectedOffering.imageUrl || selectedOffering.image_url || undefined,
          }
        } else {
          offeringPayload = offeringId // fallback to ID for Signal to resolve
        }
      }

      const utmParams = (utmSource || utmMedium || utmCampaign || utmContent) ? {
        source: utmSource || undefined,
        medium: utmMedium || undefined,
        campaign: utmCampaign || undefined,
        content: utmContent || undefined,
      } : undefined

      const payload = {
        description,
        tone,
        images: uploadedImages,
        brandColor,
        logoUrl: currentProject?.logo_url || undefined,
        fontFamily: fontFamily !== FONT_OPTIONS[0].value ? fontFamily : undefined,
        offering: offeringPayload,
        signatureHtml: includeSignature ? signatureHtml : undefined,
        utmParams,
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
      setSizeWarning(data.sizeWarning || null)
      setDeliverabilityScore(data.deliverabilityScore ?? null)

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
        logoUrl: currentProject?.logo_url || undefined,
        fontFamily: fontFamily !== FONT_OPTIONS[0].value ? fontFamily : undefined,
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
        logoUrl: currentProject?.logo_url || undefined,
        fontFamily: fontFamily !== FONT_OPTIONS[0].value ? fontFamily : undefined,
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

  // ── Section reorder via dnd-kit ───────────────────────────────────────
  const [isReordering, setIsReordering] = useState(false)
  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!active || !over || active.id === over.id) return

    const oldIndex = sections.findIndex(s => s.id === active.id)
    const newIndex = sections.findIndex(s => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(sections, oldIndex, newIndex)
    setSections(reordered) // Optimistic update

    setIsReordering(true)
    try {
      const res = await emailApi.composeWithSignal({
        reorderSections: reordered.map(s => s.id),
        currentSections: reordered,
        brandColor,
        logoUrl: currentProject?.logo_url || undefined,
        fontFamily: fontFamily !== FONT_OPTIONS[0].value ? fontFamily : undefined,
        utmParams: (utmSource || utmMedium || utmCampaign) ? { source: utmSource, medium: utmMedium, campaign: utmCampaign, content: utmContent } : undefined,
        description: '',
        tone,
        images: [],
      })
      const data = res.data || res
      if (data.html) setHtml(data.html)
      if (data.sections) setSections(data.sections)
    } catch {
      toast.error('Failed to reorder sections')
      // Revert optimistic update
      setSections(sections)
    } finally {
      setIsReordering(false)
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
      await createTemplate({
        name: subject || 'Signal Generated Template',
        subject,
        html,
        preview_text: previewText,
        category: 'custom',
        json_content: {
          sections,
          tone,
          brandColor,
          fontFamily,
          templateType: result?.templateType,
        },
      })
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
        logoUrl: currentProject?.logo_url || undefined,
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
  }, [step, html, darkPreview, previewDevice])

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

            {/* Browse project image library */}
            {projectImages.length > 0 && (
              <GlassCard>
                <GlassCardContent className="p-4">
                  <button
                    onClick={() => setShowLibrary(!showLibrary)}
                    className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] w-full"
                  >
                    <FolderOpen className="h-4 w-4 text-[var(--text-secondary)]" />
                    Browse Project Images ({projectImages.length})
                    <ChevronDown className={cn('h-4 w-4 text-[var(--text-tertiary)] ml-auto transition-transform', showLibrary && 'rotate-180')} />
                  </button>
                  {showLibrary && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {projectImages.slice(0, 12).map((img) => (
                        <button
                          key={img.id}
                          onClick={() => addLibraryImage(img)}
                          className={cn(
                            'relative rounded-lg overflow-hidden border border-[var(--glass-border)]',
                            'hover:border-[var(--brand-primary)] hover:ring-1 hover:ring-[var(--brand-primary)]/30 transition-all',
                            images.some(i => i.url === img.url) && 'opacity-50 pointer-events-none'
                          )}
                        >
                          <img src={img.thumbnail} alt={img.name} className="w-full h-16 object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </GlassCardContent>
              </GlassCard>
            )}

            {/* Font picker */}
            <GlassCard>
              <GlassCardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Label className="text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">
                    Font
                  </Label>
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          <span style={{ fontFamily: f.value }}>{f.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

            {/* UTM Tracking (collapsible) */}
            <GlassCard>
              <GlassCardContent className="p-4">
                <button
                  onClick={() => setShowUtm(!showUtm)}
                  className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] w-full"
                >
                  UTM Tracking
                  <Badge variant="secondary" className="text-[10px]">Optional</Badge>
                  <ChevronDown className={cn('h-4 w-4 text-[var(--text-tertiary)] ml-auto transition-transform', showUtm && 'rotate-180')} />
                </button>
                {showUtm && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <Label className="text-xs text-[var(--text-secondary)]">Source</Label>
                      <Input value={utmSource} onChange={(e) => setUtmSource(e.target.value)} placeholder="email" className="mt-1 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs text-[var(--text-secondary)]">Medium</Label>
                      <Input value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} placeholder="newsletter" className="mt-1 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs text-[var(--text-secondary)]">Campaign</Label>
                      <Input value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} placeholder="spring-sale" className="mt-1 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs text-[var(--text-secondary)]">Content</Label>
                      <Input value={utmContent} onChange={(e) => setUtmContent(e.target.value)} placeholder="cta-button" className="mt-1 text-sm" />
                    </div>
                  </div>
                )}
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
                  <div className="flex items-center gap-1">
                    {/* Device toggle */}
                    <button
                      onClick={() => setPreviewDevice('desktop')}
                      className={cn('p-1.5 rounded-lg transition-colors', previewDevice === 'desktop' ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : 'hover:bg-[var(--glass-bg)] text-[var(--text-secondary)]')}
                      title="Desktop preview"
                    >
                      <Monitor className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPreviewDevice('mobile')}
                      className={cn('p-1.5 rounded-lg transition-colors', previewDevice === 'mobile' ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : 'hover:bg-[var(--glass-bg)] text-[var(--text-secondary)]')}
                      title="Mobile preview"
                    >
                      <Smartphone className="h-4 w-4" />
                    </button>
                    <div className="w-px h-4 bg-[var(--glass-border)] mx-1" />
                    {/* Dark/light toggle */}
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
                </div>
                {/* Size warning */}
                {sizeWarning && (
                  <div className="px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="text-xs text-amber-600">{sizeWarning}</span>
                  </div>
                )}
                {/* Deliverability score */}
                {deliverabilityScore != null && (
                  <div className="px-3 py-2 border-b border-[var(--glass-border)] flex items-center gap-2">
                    <Shield className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      deliverabilityScore >= 80 ? 'text-emerald-500' :
                      deliverabilityScore >= 60 ? 'text-amber-500' :
                      deliverabilityScore >= 40 ? 'text-orange-500' : 'text-red-500'
                    )} />
                    <span className="text-xs text-[var(--text-secondary)]">
                      Deliverability:
                      <span className={cn(
                        'font-medium ml-1',
                        deliverabilityScore >= 80 ? 'text-emerald-600' :
                        deliverabilityScore >= 60 ? 'text-amber-600' :
                        deliverabilityScore >= 40 ? 'text-orange-600' : 'text-red-600'
                      )}>
                        {deliverabilityScore}/100
                        {deliverabilityScore >= 80 ? ' — Excellent' :
                         deliverabilityScore >= 60 ? ' — Good' :
                         deliverabilityScore >= 40 ? ' — Fair' : ' — Poor'}
                      </span>
                    </span>
                  </div>
                )}
                <div
                  className={cn(
                    'flex-1 overflow-auto flex justify-center p-4',
                    darkPreview ? 'bg-gray-900' : 'bg-gray-100'
                  )}
                >
                  <iframe
                    ref={iframeRef}
                    title="Email Preview"
                    className="bg-white rounded-lg shadow-lg border-0 transition-all duration-300"
                    style={{ width: previewDevice === 'mobile' ? 375 : 600, minHeight: 400, maxWidth: '100%' }}
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

                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {sections.map((section, idx) => (
                            <SortableSection
                              key={section.id}
                              section={section}
                              idx={idx}
                              editingSection={editingSection}
                              sectionEditText={sectionEditText}
                              setSectionEditText={setSectionEditText}
                              sectionRewriting={sectionRewriting}
                              handleEditSection={handleEditSection}
                              handleSaveSectionEdit={handleSaveSectionEdit}
                              handleRemoveSection={handleRemoveSection}
                              setEditingSection={setEditingSection}
                              isReordering={isReordering}
                            />
                          ))}

                          {sections.length === 0 && (
                            <p className="text-xs text-[var(--text-tertiary)] text-center py-4">
                              No editable sections detected
                            </p>
                          )}
                        </div>
                      </SortableContext>
                    </DndContext>
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
