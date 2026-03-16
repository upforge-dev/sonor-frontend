/**
 * CmsImagePicker - Dual-source image picker for CMS sections.
 * Sources: (1) Upload to Sanity via CMS assets API, (2) Existing managed images from Portal.
 * Includes hotspot picker for focal-point–aware cropping.
 */
import { useState, useRef, useCallback } from 'react'
import { Upload, Image as ImageIcon, Loader2, X, Crosshair } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUploadCmsAsset, useSiteImages, useCmsStatus } from '@/lib/hooks'
import useAuthStore from '@/lib/auth-store'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Sanity CDN preview URL builder (dashboard-side, lightweight)
// ---------------------------------------------------------------------------

function sanityPreviewUrl(ref, sanityProjectId, sanityDataset, width = 600) {
  if (!ref) return ''
  const projectId = sanityProjectId || 'l55lyemx'
  const dataset = sanityDataset || 'production'
  // ref format: image-{id}-{WxH}-{ext}  →  {id}-{WxH}.{ext}
  const parts = ref.replace('image-', '').split('-')
  const ext = parts.pop()
  const rest = parts.join('-')
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${rest}.${ext}?w=${width}&auto=format`
}

// ---------------------------------------------------------------------------
// Hotspot Picker — click to set focal point
// ---------------------------------------------------------------------------
function HotspotPicker({ imageRef, hotspot, onHotspotChange, sanityProjectId, sanityDataset }) {
  const containerRef = useRef(null)
  const previewUrl = sanityPreviewUrl(imageRef, sanityProjectId, sanityDataset, 600)

  const handleClick = useCallback(
    (e) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
      onHotspotChange({ x, y, width: 1, height: 1 })
    },
    [onHotspotChange],
  )

  if (!previewUrl) return null

  const dotX = (hotspot?.x ?? 0.5) * 100
  const dotY = (hotspot?.y ?? 0.5) * 100

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        <Crosshair className="h-3 w-3" />
        Focal Point — click to set
      </Label>
      <div
        ref={containerRef}
        className="relative border rounded-md overflow-hidden cursor-crosshair select-none"
        onClick={handleClick}
      >
        <img
          src={previewUrl}
          alt="Hotspot preview"
          className="w-full block"
          draggable={false}
        />
        {/* Focal point indicator */}
        <div
          className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${dotX}%`, top: `${dotY}%` }}
        >
          <div className="w-5 h-5 rounded-full border-2 border-white shadow-md bg-primary/60" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Focal point: {(dotX).toFixed(0)}% × {(dotY).toFixed(0)}%
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CmsImagePicker
// ---------------------------------------------------------------------------

/**
 * @param {Object} props
 * @param {Object|null} props.value - Current image ref ({ _type: 'image', asset: { _ref }, alt, hotspot?, crop? })
 * @param {(image: Object|null) => void} props.onChange
 * @param {string} [props.label]
 */
export function CmsImagePicker({ value, onChange, label = 'Image' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [altText, setAltText] = useState(value?.alt || '')
  const [showHotspot, setShowHotspot] = useState(false)
  const fileRef = useRef(null)

  const { currentProject } = useAuthStore()
  const projectId = currentProject?.id
  const uploadAsset = useUploadCmsAsset()
  const { data: managedImages = [] } = useSiteImages(projectId, { enabled: !!projectId && isOpen })
  const { data: cmsStatus } = useCmsStatus(projectId)
  const sanityProjectId = cmsStatus?.sanity_project_id
  const sanityDataset = cmsStatus?.sanity_dataset

  const imagesList = Array.isArray(managedImages) ? managedImages : managedImages?.images || []

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const result = await uploadAsset.mutateAsync(file)
      onChange({
        _type: 'image',
        asset: { _type: 'reference', _ref: result.assetId || result._id },
        alt: altText,
      })
      toast.success('Image uploaded')
      setIsOpen(false)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to upload image')
    }
  }

  const handleSelectManaged = (img) => {
    onChange({
      _type: 'image',
      asset: { _type: 'reference', _ref: img.url || img.id },
      alt: img.alt_text || altText,
    })
    setIsOpen(false)
  }

  const handleRemove = () => {
    onChange(null)
    setAltText('')
    setShowHotspot(false)
  }

  const handleAltChange = (newAlt) => {
    setAltText(newAlt)
    if (value) {
      onChange({ ...value, alt: newAlt })
    }
  }

  const handleHotspotChange = useCallback(
    (hotspot) => {
      if (value) {
        onChange({ ...value, hotspot })
      }
    },
    [value, onChange],
  )

  const hasImage = value?.asset?._ref
  const previewUrl = hasImage ? sanityPreviewUrl(value.asset._ref, sanityProjectId, sanityDataset, 400) : ''

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>

      {hasImage ? (
        <div className="space-y-2">
          <div className="relative border rounded-md overflow-hidden group">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={altText || ''}
                className="w-full block aspect-video object-cover"
                style={
                  value.hotspot
                    ? { objectPosition: `${(value.hotspot.x * 100).toFixed(0)}% ${(value.hotspot.y * 100).toFixed(0)}%` }
                    : undefined
                }
              />
            ) : (
              <div className="aspect-video bg-muted flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                <span className="ml-2 text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                  {value.asset._ref}
                </span>
              </div>
            )}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => setShowHotspot(!showHotspot)} title="Set focal point">
                <Crosshair className="h-3.5 w-3.5" />
              </Button>
              <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => setIsOpen(true)}>
                <ImageIcon className="h-3.5 w-3.5" />
              </Button>
              <Button variant="destructive" size="icon" className="h-7 w-7" onClick={handleRemove}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Hotspot picker (toggled) */}
          {showHotspot && (
            <HotspotPicker
              imageRef={value.asset._ref}
              hotspot={value.hotspot}
              onHotspotChange={handleHotspotChange}
              sanityProjectId={sanityProjectId}
              sanityDataset={sanityDataset}
            />
          )}

          <div className="px-0">
            <Input
              value={altText}
              onChange={(e) => handleAltChange(e.target.value)}
              placeholder="Alt text..."
              className="h-7 text-xs"
            />
          </div>
        </div>
      ) : (
        <Button variant="outline" className="w-full h-20" onClick={() => setIsOpen(true)}>
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImageIcon className="h-5 w-5" />
            <span className="text-xs">Choose image</span>
          </div>
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose Image</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="upload">
            <TabsList className="w-full">
              <TabsTrigger value="upload" className="flex-1">Upload New</TabsTrigger>
              <TabsTrigger value="managed" className="flex-1">Managed Images</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-3 pt-3">
              <div>
                <Label className="text-xs text-muted-foreground">Alt Text</Label>
                <Input
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe the image..."
                />
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                className="w-full"
                onClick={() => fileRef.current?.click()}
                disabled={uploadAsset.isPending}
              >
                {uploadAsset.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Image
              </Button>
            </TabsContent>

            <TabsContent value="managed" className="pt-3">
              {imagesList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No managed images for this project.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {imagesList.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => handleSelectManaged(img)}
                      className="border rounded-md overflow-hidden hover:ring-2 ring-primary transition-all aspect-square bg-muted flex items-center justify-center"
                    >
                      {img.url ? (
                        <img src={img.url} alt={img.alt_text || ''} className="object-cover w-full h-full" />
                      ) : (
                        <div className="text-center p-2">
                          <ImageIcon className="h-5 w-5 mx-auto text-muted-foreground/50" />
                          <span className="text-xs text-muted-foreground truncate block mt-1">
                            {img.slot_id}
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CmsImagePicker
