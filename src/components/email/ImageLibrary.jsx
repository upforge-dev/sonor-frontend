/**
 * ImageLibrary - Upload and manage email images
 * Supports drag-drop, Supabase Storage, and image optimization
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Image,
  Upload,
  Search,
  Grid3X3,
  List,
  Folder,
  FolderPlus,
  MoreVertical,
  Trash2,
  Download,
  Link2,
  Copy,
  Check,
  X,
  CloudUpload,
  ImagePlus,
  FileImage,
  Sparkles,
  Wand2,
  Loader2,
  ExternalLink
} from 'lucide-react'
import './styles/liquid-glass.css'

// Image preview with lazy loading
function ImageCard({ image, isSelected, onSelect, onDelete, viewMode }) {
  const [copied, setCopied] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const copyUrl = async (e) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(image.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (viewMode === 'list') {
    return (
      <div 
        onClick={() => onSelect(image)}
        className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${
          isSelected 
            ? 'bg-indigo-50 border-2 border-indigo-500' 
            : 'glass-card hover:shadow-lg'
        }`}
      >
        <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
          <img 
            src={image.thumbnail || image.url} 
            alt={image.name}
            className="w-full h-full object-cover"
            onLoad={() => setIsLoaded(true)}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{image.name}</p>
          <p className="text-sm text-muted-foreground">
            {image.width}×{image.height} • {(image.size / 1024).toFixed(1)} KB
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={copyUrl}>
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={copyUrl}>
                <Link2 className="h-4 w-4 mr-2" />
                Copy URL
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600" onClick={(e) => {
                e.stopPropagation()
                onDelete(image)
              }}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  return (
    <div 
      onClick={() => onSelect(image)}
      className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all ${
        isSelected 
          ? 'ring-2 ring-indigo-500 ring-offset-2' 
          : 'hover:shadow-lg'
      }`}
    >
      <div className="aspect-square bg-gray-100">
        {!isLoaded && (
          <div className="absolute inset-0 glass-skeleton" />
        )}
        <img 
          src={image.thumbnail || image.url} 
          alt={image.name}
          className={`w-full h-full object-cover transition-opacity ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
        />
      </div>
      
      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-sm font-medium truncate">{image.name}</p>
          <p className="text-white/70 text-xs">{image.width}×{image.height}</p>
        </div>
        <div className="absolute top-2 right-2 flex gap-1">
          <Button 
            variant="secondary" 
            size="icon" 
            className="h-7 w-7"
            onClick={copyUrl}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
          <Button 
            variant="secondary" 
            size="icon" 
            className="h-7 w-7 hover:bg-red-100 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(image)
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-2 left-2 p-1 bg-indigo-500 rounded-full">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
    </div>
  )
}

const DEFAULT_IMAGES = [
  { id: 1, name: 'hero-banner.jpg', url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800', thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200', width: 1200, height: 600, size: 245000, folder: 'campaigns' },
  { id: 2, name: 'product-1.png', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800', thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200', width: 800, height: 800, size: 156000, folder: 'products' },
  { id: 3, name: 'team-photo.jpg', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800', thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200', width: 1600, height: 900, size: 320000, folder: 'about' },
  { id: 4, name: 'logo.png', url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=800', thumbnail: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200', width: 200, height: 200, size: 24000, folder: 'brand' },
  { id: 5, name: 'sale-banner.jpg', url: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=800', thumbnail: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=200', width: 1200, height: 400, size: 189000, folder: 'campaigns' },
  { id: 6, name: 'cta-background.jpg', url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800', thumbnail: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=200', width: 1920, height: 1080, size: 456000, folder: 'backgrounds' },
]

const DEFAULT_FOLDERS = ['all', 'campaigns', 'products', 'about', 'brand', 'backgrounds']

// Upload dropzone
function UploadDropzone({ onUpload, isUploading, uploadProgress }) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files).filter(f => 
      f.type.startsWith('image/')
    )
    if (files.length > 0) {
      onUpload(files)
    }
  }, [onUpload])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(f => 
      f.type.startsWith('image/')
    )
    if (files.length > 0) {
      onUpload(files)
    }
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
        isDragging 
          ? 'border-indigo-500 bg-indigo-50/50' 
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {isUploading ? (
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
            <CloudUpload className="h-8 w-8 text-indigo-600 animate-bounce" />
          </div>
          <p className="font-medium">Uploading...</p>
          <Progress value={uploadProgress} className="max-w-xs mx-auto" />
        </div>
      ) : (
        <>
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-4">
            <ImagePlus className="h-8 w-8 text-indigo-600" />
          </div>
          <p className="font-medium mb-1">
            {isDragging ? 'Drop images here' : 'Drag & drop images'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            or click to browse • PNG, JPG, GIF up to 5MB
          </p>
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            className="glass-button"
          >
            <Upload className="h-4 w-4 mr-2" />
            Browse Files
          </Button>
        </>
      )}
    </div>
  )
}

export default function ImageLibrary({ 
  open, 
  onOpenChange, 
  onSelect, 
  onUpload: externalUpload,
  images: providedImages = [], 
  loading = false,
  uploadProgress: externalUploadProgress = 0
}) {
  const [images, setImages] = useState(DEFAULT_IMAGES)
  const [selectedImage, setSelectedImage] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFolder, setCurrentFolder] = useState('all')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const folders = Array.from(new Set(['all', ...(images.map((img) => img.folder || 'project'))]))

  useEffect(() => {
    if (providedImages && providedImages.length > 0) {
      const mapped = providedImages.map((file) => ({
        id: file.id,
        name: file.filename || file.name,
        url: file.url,
        thumbnail: file.url,
        width: file.width || 0,
        height: file.height || 0,
        size: file.fileSize || file.size || 0,
        folder: 'project'
      }))
      setImages(mapped)
    } else {
      setImages(DEFAULT_IMAGES)
    }
  }, [providedImages])
  
  const filteredImages = images.filter(img => {
    const matchesSearch = img.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFolder = currentFolder === 'all' || img.folder === currentFolder
    return matchesSearch && matchesFolder
  })

  const handleUpload = async (files) => {
    // If external upload handler provided, use it
    if (externalUpload) {
      setIsUploading(true)
      try {
        for (const file of files) {
          await externalUpload(file)
        }
      } finally {
        setIsUploading(false)
      }
      return
    }

    // Fallback: mock upload for demo/testing
    setIsUploading(true)
    setUploadProgress(0)

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 200))
      setUploadProgress(i)
    }

    // Add mock uploaded images
    const newImages = files.map((file, index) => ({
      id: Date.now() + index,
      name: file.name,
      url: URL.createObjectURL(file),
      thumbnail: URL.createObjectURL(file),
      width: 800,
      height: 600,
      size: file.size,
      folder: currentFolder === 'all' ? 'campaigns' : currentFolder
    }))

    setImages([...newImages, ...images])
    setIsUploading(false)
    setUploadProgress(0)
  }

  const handleDelete = (image) => {
    setImages(images.filter(i => i.id !== image.id))
    if (selectedImage?.id === image.id) {
      setSelectedImage(null)
    }
  }

  const handleInsert = () => {
    if (selectedImage && onSelect) {
      onSelect(selectedImage)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col glass-panel border-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Image Library
          </DialogTitle>
          <DialogDescription>
            Upload and manage images for your email campaigns
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="library" className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <TabsList>
              <TabsTrigger value="library" className="gap-2">
                <FileImage className="h-4 w-4" />
                My Images
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="stock" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Stock Photos
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search images..."
                  className="pl-9 w-48 glass-input"
                />
              </div>
              <div className="flex items-center border rounded-lg p-1">
                <Button 
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button 
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <TabsContent value="library" className="flex-1 flex overflow-hidden mt-4">
            {/* Folders sidebar */}
            <div className="w-48 border-r pr-4 space-y-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Folders</span>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </div>
              {folders.map((folder) => (
                <button
                  key={folder}
                  onClick={() => setCurrentFolder(folder)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentFolder === folder
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Folder className="h-4 w-4" />
                  <span className="capitalize">{folder}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {folder === 'all' ? images.length : images.filter(i => i.folder === folder).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Image grid */}
            <div className="flex-1 pl-4 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading images…</span>
                </div>
              ) : filteredImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <FileImage className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="font-medium">No images found</p>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'Try a different search' : 'Upload some images to get started'}
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-4 gap-4">
                  {filteredImages.map((image) => (
                    <ImageCard
                      key={image.id}
                      image={image}
                      isSelected={selectedImage?.id === image.id}
                      onSelect={setSelectedImage}
                      onDelete={handleDelete}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredImages.map((image) => (
                    <ImageCard
                      key={image.id}
                      image={image}
                      isSelected={selectedImage?.id === image.id}
                      onSelect={setSelectedImage}
                      onDelete={handleDelete}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="flex-1 p-4">
            <UploadDropzone 
              onUpload={handleUpload}
              isUploading={isUploading}
              uploadProgress={externalUploadProgress || uploadProgress}
            />
            
            <div className="mt-6 p-4 glass-accent rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <span className="font-medium">Image Tips</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use images at least 600px wide for best email display</li>
                <li>• Compress images to under 200KB for faster loading</li>
                <li>• Use PNG for logos and graphics, JPG for photos</li>
                <li>• Always add alt text for accessibility</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="stock" className="flex-1 p-4">
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-4">
                <Wand2 className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Stock Photo Integration</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Search millions of free stock photos from Unsplash, Pexels, and Pixabay to use in your emails.
              </p>
              <div className="relative max-w-md w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search for photos..."
                  className="pl-12 h-12 text-lg glass-input"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Coming soon • Connect your Unsplash API key in settings
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer with selected image info and actions */}
        {selectedImage && (
          <div className="border-t pt-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                <img 
                  src={selectedImage.thumbnail || selectedImage.url} 
                  alt={selectedImage.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="font-medium">{selectedImage.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedImage.width}×{selectedImage.height} • {(selectedImage.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setSelectedImage(null)}>
                Cancel
              </Button>
              <Button onClick={handleInsert} className="gap-2">
                <Image className="h-4 w-4" />
                Insert Image
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
