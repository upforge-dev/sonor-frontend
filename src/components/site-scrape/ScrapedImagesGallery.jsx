import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Image,
  Search,
  Download,
  Trash2,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  Grid3X3,
  List,
  ZoomIn,
  Palette,
  User,
  ShoppingBag,
  Star,
  Building,
  ImageIcon,
} from 'lucide-react'
import { portalApi } from '@/lib/sonor-api'

const IMAGE_CATEGORY_ICONS = {
  logo: Star,
  favicon: Star,
  hero: Image,
  'team-member': User,
  product: ShoppingBag,
  service: ShoppingBag,
  gallery: ImageIcon,
  background: Palette,
  icon: Star,
  testimonial: User,
  partner: Building,
  decorative: Palette,
  content: ImageIcon,
  unknown: ImageIcon,
}

const IMAGE_CATEGORY_COLORS = {
  logo: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  hero: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'team-member': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  product: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  gallery: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  content: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  unknown: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

export function ScrapedImagesGallery({ scrapeId, scrapeData, onRefresh }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedImages, setSelectedImages] = useState(new Set())
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [previewImage, setPreviewImage] = useState(null)

  useEffect(() => {
    fetchImages()
  }, [scrapeId])

  const fetchImages = async () => {
    try {
      setLoading(true)
      const response = await portalApi.get(`/site-scrape/${scrapeId}/images`)
      if (response.images) {
        setImages(response.images)
        // Select all downloaded images by default
        const downloadedIds = response.images
          .filter((img) => img.download_status === 'completed')
          .map((img) => img.id)
        setSelectedImages(new Set(downloadedIds))
      }
    } catch (err) {
      toast.error('Failed to load images')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleImage = (imageId) => {
    const newSelected = new Set(selectedImages)
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId)
    } else {
      newSelected.add(imageId)
    }
    setSelectedImages(newSelected)
  }

  const selectAll = () => {
    setSelectedImages(new Set(filteredImages.map((img) => img.id)))
  }

  const selectNone = () => {
    setSelectedImages(new Set())
  }

  const selectByCategory = (category) => {
    const categoryImages = images.filter((img) => img.context === category)
    setSelectedImages(new Set(categoryImages.map((img) => img.id)))
  }

  // Filter images
  const filteredImages = images.filter((img) => {
    const matchesSearch =
      !search ||
      img.alt?.toLowerCase().includes(search.toLowerCase()) ||
      img.original_url?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !selectedCategory || img.context === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Group by category for stats
  const imagesByCategory = images.reduce((acc, img) => {
    const cat = img.context || 'unknown'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(img)
    return acc
  }, {})

  const categories = Object.keys(imagesByCategory).sort()

  const downloadedCount = images.filter((img) => img.download_status === 'completed').length
  const pendingCount = images.filter((img) => img.download_status === 'pending').length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Scraped Images ({images.length})
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {downloadedCount} downloaded, {pendingCount} pending
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'bg-[var(--surface-secondary)]' : ''}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'bg-[var(--surface-secondary)]' : ''}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={selectNone}>
            Select None
          </Button>
          <Button variant="outline" size="sm" onClick={fetchImages}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search images..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={selectedCategory === null ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              className={cn('cursor-pointer', selectedCategory === cat && IMAGE_CATEGORY_COLORS[cat])}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            >
              {cat} ({imagesByCategory[cat].length})
            </Badge>
          ))}
        </div>
      </div>

      {/* Selection summary */}
      <div className="bg-[var(--surface-secondary)] rounded-lg p-3 flex items-center justify-between">
        <span className="text-sm text-[var(--text-secondary)]">
          {selectedImages.size} of {images.length} images selected for import
        </span>
        <div className="flex gap-2">
          {categories.slice(0, 3).map((cat) => (
            <Button
              key={cat}
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => selectByCategory(cat)}
            >
              Select all {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Images grid/list */}
      <ScrollArea className="h-[400px] border border-[var(--glass-border)] rounded-lg">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-3">
            {filteredImages.map((image) => {
              const Icon = IMAGE_CATEGORY_ICONS[image.context] || ImageIcon
              const isSelected = selectedImages.has(image.id)
              const isDownloaded = image.download_status === 'completed'

              return (
                <div
                  key={image.id}
                  className={cn(
                    'relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer',
                    isSelected
                      ? 'border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/20'
                      : 'border-transparent hover:border-[var(--glass-border)]'
                  )}
                  onClick={() => toggleImage(image.id)}
                >
                  {/* Image */}
                  <div className="aspect-square bg-[var(--surface-secondary)] relative">
                    <img
                      src={image.storage_path || image.original_url}
                      alt={image.alt || ''}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23ddd"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="14">No Image</text></svg>'
                      }}
                    />

                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPreviewImage(image)
                        }}
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(image.original_url, '_blank')
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Selection indicator */}
                    <div className="absolute top-2 left-2">
                      <Checkbox
                        checked={isSelected}
                        className="bg-white/90"
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => toggleImage(image.id)}
                      />
                    </div>

                    {/* Download status */}
                    <div className="absolute top-2 right-2">
                      {isDownloaded ? (
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                          <Download className="h-3 w-3 text-white animate-bounce" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info bar */}
                  <div className="p-2 bg-[var(--surface-secondary)]">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3 w-3 text-[var(--text-tertiary)]" />
                      <span className="text-xs text-[var(--text-tertiary)] truncate">
                        {image.context || 'unknown'}
                      </span>
                    </div>
                    {image.alt && (
                      <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                        {image.alt}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredImages.map((image) => {
              const Icon = IMAGE_CATEGORY_ICONS[image.context] || ImageIcon
              const isSelected = selectedImages.has(image.id)
              const isDownloaded = image.download_status === 'completed'

              return (
                <div
                  key={image.id}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-[var(--brand-primary)]/5'
                      : 'hover:bg-[var(--surface-hover)]'
                  )}
                  onClick={() => toggleImage(image.id)}
                >
                  <Checkbox checked={isSelected} />

                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-[var(--surface-secondary)] shrink-0">
                    <img
                      src={image.storage_path || image.original_url}
                      alt={image.alt || ''}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {image.alt || 'Untitled image'}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] truncate">
                      {image.original_url}
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className={cn('shrink-0', IMAGE_CATEGORY_COLORS[image.context])}
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {image.context || 'unknown'}
                  </Badge>

                  {isDownloaded ? (
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Download className="h-4 w-4 text-yellow-500 shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {filteredImages.length === 0 && (
          <div className="text-center py-12 text-[var(--text-tertiary)]">
            {search ? 'No images match your search' : 'No images found'}
          </div>
        )}
      </ScrollArea>

      {/* Image preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewImage?.alt || 'Image Preview'}</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="space-y-4">
              <img
                src={previewImage.storage_path || previewImage.original_url}
                alt={previewImage.alt || ''}
                className="w-full rounded-lg"
              />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[var(--text-tertiary)]">Category</p>
                  <p className="font-medium">{previewImage.context || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-[var(--text-tertiary)]">Dimensions</p>
                  <p className="font-medium">
                    {previewImage.width || '?'} × {previewImage.height || '?'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[var(--text-tertiary)]">Source URL</p>
                  <p className="font-mono text-xs break-all">{previewImage.original_url}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ScrapedImagesGallery
