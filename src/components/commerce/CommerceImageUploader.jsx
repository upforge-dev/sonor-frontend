/**
 * CommerceImageUploader
 *
 * Drag-and-drop image uploader for commerce offerings.
 * Supports featured image and gallery images; gallery images can be reordered via drag-and-drop.
 * Images are stored in Files module under Commerce/{type}s/{slug}/
 * MIGRATED TO REACT QUERY HOOKS - Jan 29, 2026
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { DndContext, closestCenter, useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useUploadCommerceImage, useDeleteCommerceImage, useUpdateCommerceOffering, commerceKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ImagePlus,
  X,
  Star,
  Loader2,
  AlertCircle,
  Upload,
  GripVertical,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/** Normalize stored model info (snake_case / camelCase / minor key drift). */
function normalizeModelInfo(raw) {
  if (!raw || typeof raw !== 'object') return null
  const height = raw.height ?? raw.Height
  const weight = raw.weight ?? raw.Weight
  const wearing_size = raw.wearing_size ?? raw.wearingSize ?? raw.size
  const model_name = raw.model_name ?? raw.modelName
  const out = {}
  if (height != null && String(height).trim() !== '') out.height = String(height).trim()
  if (weight != null && String(weight).trim() !== '') out.weight = String(weight).trim()
  if (wearing_size != null && String(wearing_size).trim() !== '') out.wearing_size = String(wearing_size).trim()
  if (model_name != null && String(model_name).trim() !== '') out.model_name = String(model_name).trim()
  return Object.keys(out).length ? out : null
}

function uuidKeyNorm(s) {
  return String(s).replace(/-/g, '').toLowerCase()
}

/**
 * Pull image_model_info record from offering.metadata (jsonb string, camelCase alias, nested JSON string).
 * Exported for edit screen merge with form state.
 */
export function extractImageModelInfoMap(metadata) {
  if (metadata == null) return {}
  let meta = metadata
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta)
    } catch {
      return {}
    }
  }
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) return {}

  let raw = meta.image_model_info ?? meta.imageModelInfo
  if (raw == null) return {}
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw)
    } catch {
      return {}
    }
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  return { ...raw }
}

function urlKeyMatches(imageUrl, key) {
  if (!imageUrl || typeof key !== 'string') return false
  if (key === imageUrl) return true
  if (key.startsWith('http') || key.startsWith('//')) {
    return imageUrl.includes(key) || key.includes(imageUrl)
  }
  try {
    const path = new URL(imageUrl, 'https://placeholder.local').pathname
    return key === path || path.endsWith(key) || key.endsWith(path)
  } catch {
    return imageUrl.includes(key)
  }
}

/** Resolve model info for a file id (UUID dash/case drift, optional URL-shaped keys). */
function resolveImageModelInfo(imageModelInfo, imageId, imageUrl) {
  if (!imageModelInfo || imageId == null || imageId === '') return undefined
  const sid = String(imageId)
  const keys = Object.keys(imageModelInfo)
  const targetNorm = uuidKeyNorm(sid)

  for (const k of keys) {
    if (k === sid || String(k).toLowerCase() === sid.toLowerCase()) {
      return normalizeModelInfo(imageModelInfo[k]) ?? undefined
    }
  }
  for (const k of keys) {
    if (uuidKeyNorm(k) === targetNorm) {
      return normalizeModelInfo(imageModelInfo[k]) ?? undefined
    }
  }
  if (imageUrl) {
    for (const k of keys) {
      if (urlKeyMatches(imageUrl, k)) {
        return normalizeModelInfo(imageModelInfo[k]) ?? undefined
      }
    }
  }
  return undefined
}

function ModelInfoEditor({ imageId, modelInfo, onChange }) {
  const hasSavedData = !!(
    modelInfo?.height ||
    modelInfo?.weight ||
    modelInfo?.wearing_size ||
    modelInfo?.model_name
  )
  const [expanded, setExpanded] = useState(hasSavedData)
  useEffect(() => {
    if (hasSavedData) setExpanded(true)
  }, [hasSavedData])

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1"
      >
        <Plus className="h-3 w-3" /> Model info
      </button>
    )
  }

  const handleFieldChange = (field, value) => {
    const next = { ...(modelInfo || {}), [field]: value?.trim() ? value.trim() : undefined }
    const normalized = normalizeModelInfo(next)
    onChange(imageId, normalized)
  }

  return (
    <div className="mt-2 space-y-1.5 border-t pt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Model Info</span>
        <button
          type="button"
          onClick={() => {
            onChange(imageId, null)
            setExpanded(false)
          }}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <input
          type="text"
          placeholder="Height"
          value={modelInfo?.height || ''}
          onChange={(e) => handleFieldChange('height', e.target.value)}
          className="h-7 text-xs px-2 rounded border bg-background"
        />
        <input
          type="text"
          placeholder="Weight"
          value={modelInfo?.weight || ''}
          onChange={(e) => handleFieldChange('weight', e.target.value)}
          className="h-7 text-xs px-2 rounded border bg-background"
        />
      </div>
      <input
        type="text"
        placeholder="Wearing size (e.g. XL)"
        value={modelInfo?.wearing_size || ''}
        onChange={(e) => handleFieldChange('wearing_size', e.target.value)}
        className="h-7 text-xs px-2 rounded border bg-background w-full"
      />
    </div>
  )
}

function SortableGalleryItem({ image, disabled, deletingId, onSetFeatured, onDelete, isClothing, modelInfo, onModelInfoChange }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg bg-muted border group',
        isDragging && 'opacity-60 shadow-lg z-10 ring-2 ring-primary'
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-t-lg">
        <img
          src={image.url}
          alt={image.filename || 'Gallery image'}
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
        <div
          className={cn(
            'absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between p-1',
            isDragging && 'opacity-100'
          )}
        >
          <button
            {...attributes}
            {...listeners}
            className={cn(
              'p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white touch-none',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            title="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSetFeatured(image.id)}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white"
              title="Set as featured"
            >
              <Star className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(image.id)}
              disabled={deletingId === image.id}
              className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-600 text-white"
              title="Delete"
            >
              {deletingId === image.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
      {isClothing && onModelInfoChange && (
        <div className="px-2 pb-2">
          <ModelInfoEditor
            imageId={image.id}
            modelInfo={modelInfo}
            onChange={onModelInfoChange}
          />
        </div>
      )}
    </div>
  )
}

export function CommerceImageUploader({
  offeringId,
  images = [],
  featuredImageId,
  onImagesChange,
  disabled = false,
  maxImages = 10,
  className,
  isClothing = false,
  imageModelInfo,
  onModelInfoChange,
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [isDragActive, setIsDragActive] = useState(false)
  
  const featuredInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const uploadImageMutation = useUploadCommerceImage()
  const deleteImageMutation = useDeleteCommerceImage()
  const updateOfferingMutation = useUpdateCommerceOffering()

  const validateFile = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `${file.name} is not a valid image type`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} is too large (max 5MB)`
    }
    return null
  }

  const handleFiles = useCallback(async (files, setAsFeatured = false) => {
    if (!offeringId) {
      setError('Please save the offering first before uploading images')
      return
    }

    const fileArray = Array.from(files)
    const remainingSlots = maxImages - images.length
    const filesToUpload = fileArray.slice(0, remainingSlots)
    
    if (fileArray.length > remainingSlots) {
      setError(`Only ${remainingSlots} more image(s) can be added (max ${maxImages})`)
    }

    // Validate files
    const validationErrors = filesToUpload.map(validateFile).filter(Boolean)
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '))
      return
    }

    if (filesToUpload.length === 0) return

    setUploading(true)
    setError(null)
    
    try {
      const newImages = []
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i]
        setUploadProgress(Math.round(((i + 1) / filesToUpload.length) * 100))
        
        // Set first uploaded image as featured if none exists or explicitly requested
        const isFeatured = setAsFeatured || (!featuredImageId && images.length === 0 && i === 0)
        
        const result = await uploadImageMutation.mutateAsync({ offeringId, file, isFeatured })
        newImages.push({
          id: result?.id ?? result?.fileId,
          url: result?.url ?? result?.publicUrl,
          filename: result?.filename ?? file.name,
          is_featured: isFeatured,
        })
      }
      
      onImagesChange?.([...images, ...newImages])
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload image')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [offeringId, images, featuredImageId, maxImages, onImagesChange, uploadImageMutation])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragActive(false)
    
    if (disabled || uploading || !offeringId) return
    
    const files = e.dataTransfer?.files
    if (files?.length > 0) {
      handleFiles(files, !featuredImageId)
    }
  }, [disabled, uploading, offeringId, featuredImageId, handleFiles])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    if (!disabled && !uploading && offeringId) {
      setIsDragActive(true)
    }
  }, [disabled, uploading, offeringId])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragActive(false)
  }, [])

  const handleDelete = async (imageId) => {
    if (!offeringId) return

    setDeletingId(imageId)
    try {
      await deleteImageMutation.mutateAsync({ offeringId, fileId: imageId })
      onImagesChange?.(images.filter((img) => img.id !== imageId))
    } catch (err) {
      console.error('Delete error:', err)
      setError(err.message || 'Failed to delete image')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSetFeatured = async (imageId) => {
    if (!offeringId) return

    try {
      await updateOfferingMutation.mutateAsync({
        offeringId,
        data: { featured_image_id: imageId },
      })
      onImagesChange?.(images.map((img) => ({
        ...img,
        is_featured: img.id === imageId,
      })))
    } catch (err) {
      console.error('Set featured error:', err)
      setError(err.message || 'Failed to set featured image')
    }
  }

  const FEATURED_DROP_ID = 'featured-image-drop'
  const featuredImage = images.find(img => img.is_featured || img.id === featuredImageId)
  const galleryImages = images.filter(img => !img.is_featured && img.id !== featuredImageId)

  const { setNodeRef: setFeaturedDropRef, isOver: isOverFeatured } = useDroppable({
    id: FEATURED_DROP_ID,
  })

  const handleGalleryReorder = useCallback(
    (reorderedGallery) => {
      const newImages = featuredImage
        ? [featuredImage, ...reorderedGallery]
        : [...reorderedGallery]
      onImagesChange?.(newImages)
    },
    [featuredImage, onImagesChange]
  )

  const handleDropOnFeatured = useCallback(
    (droppedImage) => {
      const restGallery = galleryImages.filter((img) => img.id !== droppedImage.id)
      const newFeatured = { ...droppedImage, is_featured: true }
      const oldFeaturedAsGallery = featuredImage ? { ...featuredImage, is_featured: false } : null
      const newImages = [newFeatured, ...(oldFeaturedAsGallery ? [oldFeaturedAsGallery, ...restGallery] : restGallery)]
      onImagesChange?.(newImages)
    },
    [featuredImage, galleryImages, onImagesChange]
  )

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event
      if (!over) return
      if (over.id === FEATURED_DROP_ID) {
        const dropped = galleryImages.find((img) => img.id === active.id)
        if (dropped) handleDropOnFeatured(dropped)
        return
      }
      if (active.id === over.id) return
      const oldIndex = galleryImages.findIndex((img) => img.id === active.id)
      const newIndex = galleryImages.findIndex((img) => img.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(galleryImages, oldIndex, newIndex)
      handleGalleryReorder(reordered)
    },
    [galleryImages, handleGalleryReorder, handleDropOnFeatured]
  )

  return (
    <div className={cn("space-y-4", className)}>
      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="ml-auto hover:text-red-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      {/* Featured Image (droppable: drag a gallery image here to set as featured) */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Featured Image
        </label>
        {featuredImage ? (
          <>
            <div
              ref={setFeaturedDropRef}
              className={cn(
                'relative aspect-[16/9] rounded-xl overflow-hidden bg-muted border group transition-all',
                isOverFeatured && 'ring-2 ring-primary ring-offset-2'
              )}
            >
              {isOverFeatured && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/20 text-primary font-medium">
                  Drop to set as featured
                </div>
              )}
              <img
                src={featuredImage.url}
                alt="Featured"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDelete(featuredImage.id)}
                  disabled={deletingId === featuredImage.id}
                  className="bg-red-500/90 hover:bg-red-600 text-white"
                >
                  {deletingId === featuredImage.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  Remove
                </Button>
              </div>
              <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Featured
              </Badge>
            </div>
            {isClothing && onModelInfoChange && (
              <div className="mt-2">
                <ModelInfoEditor
                  imageId={featuredImage.id}
                  modelInfo={resolveImageModelInfo(imageModelInfo, featuredImage.id, featuredImage.url)}
                  onChange={onModelInfoChange}
                />
              </div>
            )}
          </>
        ) : (
          <div
            ref={setFeaturedDropRef}
            onClick={() => !disabled && !uploading && offeringId && featuredInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "aspect-[16/9] rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-2",
              isDragActive 
                ? "border-primary bg-primary/10" 
                : "border-muted-foreground/25 bg-muted hover:border-primary/50",
              isOverFeatured && "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2",
              (disabled || !offeringId) && "opacity-50 cursor-not-allowed"
            )}
          >
            <input
              ref={featuredInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  handleFiles(e.target.files, true)
                  e.target.value = '' // Reset input
                }
              }}
            />
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Uploading... {uploadProgress}%
                </span>
              </>
            ) : (
              <>
                <ImagePlus className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {isDragActive ? 'Drop image here' : 'Click or drag to upload featured image'}
                </span>
                {!offeringId && (
                  <span className="text-xs text-muted-foreground">
                    Save offering first to enable uploads
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Gallery Images */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground">
            Gallery Images
          </label>
          <span className="text-xs text-muted-foreground">
            {images.length} / {maxImages}
            {galleryImages.length > 0 && (
              <span className="ml-2 text-muted-foreground/80">· Drag to reorder; drop on Featured to set as main image. Save to apply.</span>
            )}
          </span>
        </div>

        <SortableContext items={galleryImages.map((img) => img.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {galleryImages.map((image) => (
                <SortableGalleryItem
                  key={image.id}
                  image={image}
                  disabled={disabled}
                  deletingId={deletingId}
                  onSetFeatured={handleSetFeatured}
                  onDelete={handleDelete}
                  isClothing={isClothing}
                  modelInfo={resolveImageModelInfo(imageModelInfo, image.id, image.url)}
                  onModelInfoChange={onModelInfoChange}
                />
              ))}

              {/* Add more button */}
              {images.length < maxImages && (
            <div
              onClick={() => !disabled && !uploading && offeringId && galleryInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "aspect-square rounded-lg border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-1",
                isDragActive 
                  ? "border-primary bg-primary/10" 
                  : "border-muted-foreground/25 bg-muted hover:border-primary/50",
                (disabled || uploading || !offeringId) && "opacity-50 cursor-not-allowed"
              )}
            >
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    handleFiles(e.target.files, false)
                    e.target.value = '' // Reset input
                  }
                }}
              />
              {uploading ? (
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Add</span>
                </>
              )}
            </div>
          )}
            </div>
          </SortableContext>
      </div>
      </DndContext>
    </div>
  )
}

export default CommerceImageUploader
