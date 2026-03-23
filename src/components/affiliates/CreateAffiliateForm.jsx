// src/components/affiliates/CreateAffiliateForm.jsx
// Inline form for creating affiliates - shown in center panel

import { useState, useRef, useCallback } from 'react'
import { 
  Globe, 
  Upload, 
  X, 
  ArrowLeft,
  Image as ImageIcon,
  Link2,
  User,
  FileText,
  Play,
  Pause,
  Check
} from 'lucide-react'
import { UptradeSpinner } from '@/components/UptradeLoading'
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
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import useAuthStore from '@/lib/auth-store'
import { useCreateAffiliate } from '@/lib/hooks'
import { useBrandColors } from '@/hooks/useBrandColors'
import { toast } from 'sonner'

export default function CreateAffiliateForm({ onCancel, onSuccess }) {
  const { currentProject } = useAuthStore()
  const createAffiliateMutation = useCreateAffiliate()
  const { primary, toRgba } = useBrandColors()
  const fileInputRef = useRef(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFetchingLogo, setIsFetchingLogo] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [logoSource, setLogoSource] = useState(null) // 'scraped' | 'uploaded' | null

  const [formData, setFormData] = useState({
    name: '',
    website_url: '',
    logo_url: '',
    notes: '',
    status: 'active',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Scrape logo from website
  const handleWebsiteBlur = async () => {
    const url = formData.website_url
    if (!url || formData.logo_url) return

    setIsFetchingLogo(true)
    try {
      const cleanUrl = url.replace(/^https?:\/\//, '').split('/')[0]
      const logoUrl = `https://www.google.com/s2/favicons?domain=${cleanUrl}&sz=128`
      
      const img = new Image()
      img.onload = () => {
        setFormData(prev => ({ ...prev, logo_url: logoUrl }))
        setLogoSource('scraped')
        setIsFetchingLogo(false)
      }
      img.onerror = () => {
        setIsFetchingLogo(false)
      }
      img.src = logoUrl
    } catch (error) {
      setIsFetchingLogo(false)
    }
  }

  // Handle file upload
  const handleFileUpload = useCallback(async (file) => {
    if (!file || !currentProject?.id) return
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setIsUploadingLogo(true)
    try {
      // Generate unique filename
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
      const storagePath = `${currentProject.id}/affiliates/logos/${filename}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('files')
        .getPublicUrl(storagePath)

      setFormData(prev => ({ ...prev, logo_url: urlData.publicUrl }))
      setLogoSource('uploaded')
      toast.success('Logo uploaded')
    } catch (error) {
      console.error('Logo upload failed:', error)
      toast.error('Failed to upload logo')
    } finally {
      setIsUploadingLogo(false)
    }
  }, [currentProject?.id])

  // File input change
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }

  // Drag and drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  // Remove logo
  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logo_url: '' }))
    setLogoSource(null)
  }

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!currentProject?.id) return

    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    setIsSubmitting(true)
    try {
      await createAffiliateMutation.mutateAsync({ projectId: currentProject.id, data: formData })
      toast.success('Affiliate created')
      onSuccess?.()
    } catch (error) {
      toast.error('Failed to create affiliate')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b bg-[var(--glass-bg)]/50">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onCancel}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Add New Affiliate</h2>
            <p className="text-sm text-muted-foreground">Create a new affiliate partner</p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 space-y-8">
          {/* Logo Upload Section */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Logo</Label>
            
            {formData.logo_url ? (
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                  <img 
                    src={formData.logo_url} 
                    alt="Logo preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-muted-foreground">
                      {logoSource === 'uploaded' ? 'Custom logo uploaded' : 'Logo fetched from website'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Replace
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                {isUploadingLogo ? (
                  <div className="flex flex-col items-center gap-2">
                    <UptradeSpinner size="md" label="Uploading..." />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: toRgba(primary, 0.1) }}
                    >
                      <ImageIcon className="h-7 w-7" style={{ color: primary }} />
                    </div>
                    <div>
                      <p className="font-medium">
                        {isDragging ? 'Drop image here' : 'Upload a logo'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Drag and drop or click to browse • PNG, JPG up to 5MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            
            <p className="text-xs text-muted-foreground">
              Logo will be automatically fetched from their website if you don't upload one
            </p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-base font-medium">
              Name <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                name="name"
                placeholder="Company or person name"
                value={formData.name}
                onChange={handleChange}
                className="pl-9 h-11"
                required
              />
            </div>
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website_url" className="text-base font-medium">Website</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="website_url"
                name="website_url"
                placeholder="https://example.com"
                value={formData.website_url}
                onChange={handleChange}
                onBlur={handleWebsiteBlur}
                className="pl-9 h-11"
              />
              {isFetchingLogo && (
                <span className="absolute right-3 top-3">
                  <UptradeSpinner size="sm" className="[&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" />
                </span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base font-medium">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Internal notes about this affiliate..."
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-green-500" />
                    Active
                  </div>
                </SelectItem>
                <SelectItem value="paused">
                  <div className="flex items-center gap-2">
                    <Pause className="h-4 w-4 text-amber-500" />
                    Paused
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Paused affiliates won't have their tracking links active
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={!formData.name.trim()}
              style={{ backgroundColor: primary }}
            >
              <Link2 className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Creating...' : 'Create Affiliate'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
