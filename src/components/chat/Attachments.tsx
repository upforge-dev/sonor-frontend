/**
 * Attachment Components for Chat
 * 
 * Includes:
 * - AttachmentPreview: Display attachments in messages
 * - AttachmentUploader: Upload interface with drag-drop
 * - AttachmentThumbnail: Compact preview during compose
 */

import { useState, useCallback, useRef } from 'react'
import { 
  File, 
  FileText, 
  FileImage, 
  FileVideo, 
  FileAudio,
  Download, 
  X, 
  Play,
  Maximize2,
  Paperclip,
  Upload
} from 'lucide-react'
import { UptradeSpinner } from '@/components/UptradeLoading'
import { cn } from '@/lib/utils'
import { messagesApi } from '@/lib/sonor-api'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Attachment {
  id: string
  message_id?: string
  filename: string
  original_filename: string
  mime_type: string
  size_bytes: number
  storage_path?: string
  storage_bucket?: string
  /** Direct URL (e.g. Engage chat attachments from Supabase Storage) */
  url?: string
  width?: number | null
  height?: number | null
  duration_seconds?: number | null
  thumbnail_path?: string | null
}

export interface PendingAttachment {
  id: string
  file: File
  preview?: string
  progress: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
  error?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.startsWith('video/')) return FileVideo
  if (mimeType.startsWith('audio/')) return FileAudio
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText
  return File
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

function isVideo(mimeType: string): boolean {
  return mimeType.startsWith('video/')
}

function isAudio(mimeType: string): boolean {
  return mimeType.startsWith('audio/')
}

// ─────────────────────────────────────────────────────────────────────────────
// AttachmentPreview - Display attachments in sent messages
// ─────────────────────────────────────────────────────────────────────────────

interface AttachmentPreviewProps {
  attachments: Attachment[]
  className?: string
}

export function AttachmentPreview({ attachments, className }: AttachmentPreviewProps) {
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  
  const getAttachmentDisplayUrl = useCallback((attachment: Attachment): string | null => {
    if (attachment.url) return attachment.url
    if (attachment.thumbnail_path) return attachment.thumbnail_path
    if (attachment.storage_bucket && attachment.storage_path) return `${attachment.storage_bucket}/${attachment.storage_path}`
    return null
  }, [])

  const handleDownload = useCallback(async (attachment: Attachment) => {
    const directUrl = attachment.url
    if (directUrl) {
      const link = document.createElement('a')
      link.href = directUrl
      link.download = attachment.original_filename || attachment.filename
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    }
    setLoadingUrl(attachment.id)
    try {
      const { data } = await messagesApi.getAttachmentUrl(attachment.id)
      if (data?.url) {
        const link = document.createElement('a')
        link.href = data.url
        link.download = attachment.original_filename
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Failed to get attachment URL:', error)
    } finally {
      setLoadingUrl(null)
    }
  }, [])
  
  const handleImageClick = useCallback(async (attachment: Attachment) => {
    const directUrl = attachment.url || getAttachmentDisplayUrl(attachment)
    if (directUrl) {
      setLightboxImage(directUrl)
      return
    }
    try {
      const { data } = await messagesApi.getAttachmentUrl(attachment.id)
      if (data?.url) setLightboxImage(data.url)
    } catch (error) {
      console.error('Failed to get image URL:', error)
    }
  }, [getAttachmentDisplayUrl])
  
  if (!attachments || attachments.length === 0) return null
  
  // Grid layout for images
  const images = attachments.filter(a => isImage(a.mime_type))
  const videos = attachments.filter(a => isVideo(a.mime_type))
  const others = attachments.filter(a => !isImage(a.mime_type) && !isVideo(a.mime_type))
  
  return (
    <>
      <div className={cn('space-y-2 mt-2', className)}>
        {/* Image grid */}
        {images.length > 0 && (
          <div className={cn(
            'grid gap-1 rounded-lg overflow-hidden',
            images.length === 1 ? 'grid-cols-1' : 
            images.length === 2 ? 'grid-cols-2' : 
            images.length === 3 ? 'grid-cols-2' : 
            'grid-cols-2'
          )}>
            {images.map((attachment, idx) => (
              <div 
                key={attachment.id}
                className={cn(
                  'relative cursor-pointer group',
                  images.length === 3 && idx === 0 && 'row-span-2'
                )}
                onClick={() => handleImageClick(attachment)}
              >
                <img
                  src={getAttachmentDisplayUrl(attachment) || attachment.thumbnail_path || ''}
                  alt={attachment.original_filename || attachment.filename}
                  className={cn(
                    'w-full object-cover bg-[var(--surface-tertiary)]',
                    images.length === 1 ? 'max-h-[300px] rounded-lg' : 'h-32'
                  )}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Maximize2 className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Video previews */}
        {videos.map(attachment => (
          <div 
            key={attachment.id}
            className="relative rounded-lg overflow-hidden bg-[var(--surface-tertiary)]"
          >
            <div className="relative aspect-video flex items-center justify-center">
              {(attachment.thumbnail_path || attachment.url) ? (
                <img 
                  src={attachment.thumbnail_path || attachment.url || ''} 
                  alt={attachment.original_filename || attachment.filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <FileVideo className="h-12 w-12 text-[var(--text-tertiary)]" />
              )}
              <button 
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                onClick={() => handleDownload(attachment)}
              >
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="h-6 w-6 text-[var(--text-primary)] ml-1" />
                </div>
              </button>
            </div>
            <div className="p-2 flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)] truncate flex-1">
                {attachment.original_filename || attachment.filename}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">
                {formatFileSize(attachment.size_bytes ?? (attachment as { size?: number }).size ?? 0)}
              </span>
            </div>
          </div>
        ))}
        
        {/* Other files */}
        {others.map(attachment => {
          const Icon = getFileIcon(attachment.mime_type)
          const isLoading = loadingUrl === attachment.id
          const size = attachment.size_bytes ?? (attachment as { size?: number }).size ?? 0
          const name = attachment.original_filename || attachment.filename
          return (
            <button
              key={attachment.id}
              onClick={() => handleDownload(attachment)}
              disabled={isLoading}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg',
                'bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)]',
                'border border-[var(--glass-border)]/50',
                'transition-colors text-left group'
              )}
            >
              <div className="p-2 rounded-lg bg-[var(--surface-tertiary)] group-hover:bg-[var(--brand-primary)]/10 transition-colors">
                <Icon className="h-5 w-5 text-[var(--text-secondary)] group-hover:text-[var(--brand-primary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)] truncate">
                  {name}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {formatFileSize(size)}
                </p>
              </div>
              {isLoading ? (
                <UptradeSpinner size="sm" label="Loading" className="inline-flex gap-0 py-0 [&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4 [&_svg]:text-[var(--text-tertiary)]" />
              ) : (
                <Download className="h-4 w-4 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          )
        })}
      </div>
      
      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={() => setLightboxImage(null)}
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <img 
            src={lightboxImage} 
            alt="Preview" 
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AttachmentThumbnail - Compact preview for pending uploads
// ─────────────────────────────────────────────────────────────────────────────

interface AttachmentThumbnailProps {
  attachment: PendingAttachment
  onRemove: (id: string) => void
}

export function AttachmentThumbnail({ attachment, onRemove }: AttachmentThumbnailProps) {
  const Icon = getFileIcon(attachment.file.type)
  const isImageFile = isImage(attachment.file.type)
  
  return (
    <div className="relative group">
      <div className={cn(
        'w-16 h-16 rounded-lg overflow-hidden',
        'bg-[var(--surface-secondary)] border border-[var(--glass-border)]/50',
        'flex items-center justify-center'
      )}>
        {isImageFile && attachment.preview ? (
          <img 
            src={attachment.preview} 
            alt={attachment.file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon className="h-6 w-6 text-[var(--text-tertiary)]" />
        )}
        
        {/* Progress overlay */}
        {attachment.status === 'uploading' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-10 h-10 relative">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="3"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeDasharray={`${attachment.progress * 113} 113`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                {Math.round(attachment.progress * 100)}%
              </span>
            </div>
          </div>
        )}
        
        {/* Error overlay */}
        {attachment.status === 'error' && (
          <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
            <X className="h-5 w-5 text-white" />
          </div>
        )}
      </div>
      
      {/* Remove button */}
      <button
        onClick={() => onRemove(attachment.id)}
        className={cn(
          'absolute -top-1.5 -right-1.5 p-1 rounded-full',
          'bg-[var(--surface-page)] border border-[var(--glass-border)]',
          'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'shadow-md'
        )}
      >
        <X className="h-3 w-3" />
      </button>
      
      {/* Filename tooltip */}
      <div className="absolute -bottom-6 left-0 right-0 text-center">
        <span className="text-[10px] text-[var(--text-tertiary)] truncate block px-1">
          {attachment.file.name.length > 10 
            ? `${attachment.file.name.slice(0, 8)}...` 
            : attachment.file.name
          }
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AttachmentUploadButton - Button to trigger file picker
// ─────────────────────────────────────────────────────────────────────────────

interface AttachmentUploadButtonProps {
  onSelect: (files: File[]) => void
  disabled?: boolean
  accept?: string
  multiple?: boolean
  className?: string
}

export function AttachmentUploadButton({
  onSelect,
  disabled = false,
  accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt',
  multiple = true,
  className,
}: AttachmentUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onSelect(files)
    }
    // Reset input so same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [onSelect])
  
  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        aria-label="Attach file"
        className={cn(
          'p-2 rounded-lg transition-colors',
          'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
          'hover:bg-[var(--surface-secondary)]',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <Paperclip className="h-5 w-5" />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DropZone - Drag and drop area
// ─────────────────────────────────────────────────────────────────────────────

interface DropZoneProps {
  onDrop: (files: File[]) => void
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

export function DropZone({ onDrop, children, disabled = false, className }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)
  
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }, [])
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }, [])
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0
    
    if (disabled) return
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      onDrop(files)
    }
  }, [onDrop, disabled])
  
  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn('relative', className)}
    >
      {children}
      
      {/* Drop overlay */}
      {isDragging && (
        <div className={cn(
          'absolute inset-0 z-50',
          'bg-[var(--brand-primary)]/10 backdrop-blur-sm',
          'border-2 border-dashed border-[var(--brand-primary)]',
          'rounded-lg flex items-center justify-center',
          'pointer-events-none'
        )}>
          <div className="text-center">
            <Upload className="h-10 w-10 mx-auto mb-2 text-[var(--brand-primary)]" />
            <p className="text-sm font-medium text-[var(--brand-primary)]">
              Drop files here
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
