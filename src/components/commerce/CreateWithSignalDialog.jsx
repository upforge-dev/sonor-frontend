// src/components/commerce/CreateWithSignalDialog.jsx
// AI-powered service creation from SEO page content
// Supports both modal (Dialog) and embedded inline modes

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeoPages } from '@/lib/hooks'
import useAuthStore from '@/lib/auth-store'
import { portalApi } from '@/lib/sonor-api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/lib/toast'
import { UptradeSpinner } from '@/components/UptradeLoading'
import {
  Sparkles,
  Globe,
  Search,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Lightbulb,
  TrendingUp,
} from 'lucide-react'

// Call Portal API to fetch page content and analyze with Signal AI
async function generateServiceFromPage(projectId, pageData) {
  try {
    // Call Portal API: POST /commerce/analyze-page/:projectId/:pageId
    // Portal API fetches the live page, extracts content, then calls Signal AI
    const response = await portalApi.post(`/commerce/analyze-page/${projectId}/${pageData.id}`)

    // Portal API returns the Signal AI result directly
    if (response.data) {
      console.log('[Portal+Signal] Generated service from page:', response.data)
      return response.data
    }

    // Fallback if result is empty
    console.warn('[Portal] Empty result, using local fallback')
    return generateLocalFallback(pageData)
  } catch (error) {
    // Fall back to local generation if API fails
    console.warn('[Portal] API error, falling back to local generation:', error.message)
    return generateLocalFallback(pageData)
  }
}

// Local fallback when Signal API is unavailable
function generateLocalFallback(pageData) {
  const { title, h1, meta_description, path } = pageData
  
  // Extract service name from H1 or title
  const name = h1 || title?.replace(/\s*[|–-]\s*.+$/, '') || 'New Service'
  
  // Use meta description as short description
  const shortDescription = meta_description || `Professional ${name.toLowerCase()} services`
  
  // Generate longer description
  const description = meta_description 
    ? `${meta_description}\n\nOur team delivers exceptional ${name.toLowerCase()} tailored to your business needs.`
    : `Our ${name.toLowerCase()} help businesses achieve their goals with professional expertise and proven results.`

  // Extract potential features from path segments
  const pathSegments = path?.split('/').filter(Boolean) || []
  const category = pathSegments[0] || 'services'
  
  const features = [
    `Expert ${category} consultation`,
    'Customized solutions for your business',
    'Dedicated project management',
    'Ongoing support and optimization',
  ]

  return {
    name,
    short_description: shortDescription,
    description,
    features,
    suggested_pricing: {
      type: 'variable',
      min_price: null,
      max_price: null,
      pricing_notes: 'Contact for custom quote based on project scope',
    },
    suggested_duration: {
      min_hours: null,
      max_hours: null,
      typical_weeks: 'Varies by project',
    },
    seo_page_id: pageData.id,
    page_path: path,
    confidence: 0.7,
    suggestions: [
      'Add specific pricing tiers for different service levels',
      'Include case studies or portfolio examples on the service page',
      'Consider adding an intake form for lead capture',
    ],
  }
}

export default function CreateWithSignalDialog({ open, onOpenChange, embedded = false, onBack, onSuccess }) {
  const navigate = useNavigate()
  const { currentProject } = useAuthStore()
  
  // Use React Query hook for SEO pages
  const { data: pagesData, isLoading: pagesLoading } = useSeoPages(
    currentProject?.id,
    { limit: 200 },
    { enabled: (open || embedded) && !!currentProject?.id }
  )
  const seoPages = pagesData?.pages || []
  
  const [selectedPageId, setSelectedPageId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedService, setGeneratedService] = useState(null)
  const [step, setStep] = useState('select') // 'select' | 'generating' | 'review'

  // Reset state when dialog closes
  useEffect(() => {
    if (!open && !embedded) {
      setSelectedPageId('')
      setSearchQuery('')
      setGeneratedService(null)
      setStep('select')
    }
  }, [open, embedded])

  // Filter pages by search and deduplicate by path
  const filteredPages = useMemo(() => {
    // First deduplicate by path
    const seenPaths = new Set()
    const uniquePages = seoPages.filter(page => {
      if (!page.path) return false
      if (seenPaths.has(page.path)) return false
      seenPaths.add(page.path)
      return true
    })
    
    // Then filter by search
    if (!searchQuery) return uniquePages
    const q = searchQuery.toLowerCase()
    return uniquePages.filter(page => (
      page.path?.toLowerCase().includes(q) ||
      page.title?.toLowerCase().includes(q) ||
      page.h1?.toLowerCase().includes(q)
    ))
  }, [seoPages, searchQuery])

  // Get service-like pages (not blog posts, not home, etc.)
  const servicePages = useMemo(() => {
    return filteredPages.filter(page => {
      const path = page.path?.toLowerCase() || ''
      // Exclude common non-service paths
      if (path === '/' || path === '') return false
      if (path.includes('/blog/') || path.includes('/post/')) return false
      if (path.includes('/about') || path.includes('/contact')) return false
      if (path.includes('/privacy') || path.includes('/terms')) return false
      return true
    })
  }, [filteredPages])

  const selectedPage = seoPages.find(p => p.id === selectedPageId)

  const handleGenerate = async () => {
    if (!selectedPage) return

    setStep('generating')
    setIsGenerating(true)

    try {
      const service = await generateServiceFromPage(currentProject.id, selectedPage)
      setGeneratedService(service)
      setStep('review')
    } catch (error) {
      console.error('Failed to generate service:', error)
      toast.error('Failed to generate service. Please try again.')
      setStep('select')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreateService = () => {
    // Build the pre-filled data for the create form
    const params = new URLSearchParams({
      signal: 'true',
      name: generatedService.name || '',
      description: generatedService.description || '',
      short_description: generatedService.short_description || '',
      seo_page_id: generatedService.seo_page_id || '',
      page_path: generatedService.page_path || '',
      features: JSON.stringify(generatedService.features || []),
      suggestions: JSON.stringify(generatedService.suggestions || []),
    })
    
    if (embedded && onSuccess) {
      // Pass the generated service data back to parent
      onSuccess(generatedService)
    } else {
      navigate(`/commerce/services/new?${params.toString()}`)
      onOpenChange?.(false)
    }
  }

  // Handle back/cancel for embedded mode
  const handleBack = () => {
    if (step === 'review') {
      setStep('select')
    } else if (embedded && onBack) {
      onBack()
    } else {
      onOpenChange?.(false)
    }
  }

  // The main content - can be rendered inside Dialog or standalone
  const content = (
    <div className={embedded ? "space-y-6" : "flex-1 overflow-hidden flex flex-col"}>
      {/* Header for embedded mode */}
      {embedded && (
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-[var(--brand-primary)]" />
              Create with Signal
            </h1>
            <p className="text-muted-foreground">
              {step === 'select' && 'Select a page from your website to generate a service definition'}
              {step === 'generating' && 'Signal is analyzing your page content...'}
              {step === 'review' && 'Review the generated service and customize as needed'}
            </p>
          </div>
        </div>
      )}

      {step === 'select' && (
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Page list */}
          <Card className={embedded ? "flex-1" : ""}>
            <CardContent className="p-0">
              <ScrollArea className={embedded ? "h-[400px]" : "max-h-[400px]"}>
                {pagesLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <UptradeSpinner size="md" className="[&_p]:hidden [&_svg]:text-muted-foreground" />
                  </div>
                ) : servicePages.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pages found</p>
                    <p className="text-sm mt-1">Run an SEO crawl to discover your pages</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {servicePages.map((page) => (
                      <button
                        key={page.id}
                        onClick={() => setSelectedPageId(page.id)}
                        className={`w-full p-3 rounded-lg text-left transition-colors ${
                          selectedPageId === page.id
                            ? 'bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]'
                            : 'hover:bg-muted border border-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {page.title || page.h1 || page.path}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {page.path}
                            </p>
                          </div>
                          {selectedPageId === page.id && (
                            <CheckCircle className="h-5 w-5 text-[var(--brand-primary)] flex-shrink-0" />
                          )}
                        </div>
                        {page.meta_description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {page.meta_description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Selected page preview */}
          {selectedPage && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium">Selected: {selectedPage.title || selectedPage.path}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Signal will analyze this page to generate service details
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleBack}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!selectedPageId}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Service
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {step === 'generating' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
          <div className="relative">
            <Sparkles className="h-12 w-12 text-[var(--brand-primary)] animate-pulse" />
          </div>
          <div className="text-center">
            <p className="font-medium">Analyzing page content...</p>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedPage?.path}
            </p>
          </div>
          <div className="flex gap-2 mt-4">
            <Badge variant="secondary" className="animate-pulse">
              Extracting features
            </Badge>
            <Badge variant="secondary" className="animate-pulse delay-100">
              Generating description
            </Badge>
            <Badge variant="secondary" className="animate-pulse delay-200">
              Suggesting pricing
            </Badge>
          </div>
        </div>
      )}

      {step === 'review' && generatedService && (
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Confidence badge */}
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary"
              className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              {Math.round((generatedService.confidence || 0.8) * 100)}% confidence
            </Badge>
            <span className="text-xs text-muted-foreground">
              from {selectedPage?.path}
            </span>
          </div>

          {/* Generated content preview */}
          <Card className="flex-1">
            <CardContent className="p-4">
              <ScrollArea className={embedded ? "h-[350px]" : "max-h-[350px]"}>
                <div className="space-y-4 pr-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Service Name
                    </label>
                    <p className="text-lg font-semibold mt-1">{generatedService.name}</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Short Description
                    </label>
                    <p className="text-sm mt-1">{generatedService.short_description}</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Description
                    </label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{generatedService.description}</p>
                  </div>

                  {generatedService.features?.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Features
                      </label>
                      <ul className="mt-1 space-y-1">
                        {generatedService.features.map((feature, i) => (
                          <li key={i} className="text-sm flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {generatedService.suggested_pricing && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Pricing Suggestion
                      </label>
                      <p className="text-sm mt-1">
                        {generatedService.suggested_pricing.min_price && generatedService.suggested_pricing.max_price
                          ? `$${generatedService.suggested_pricing.min_price.toLocaleString()} - $${generatedService.suggested_pricing.max_price.toLocaleString()}`
                          : generatedService.suggested_pricing.pricing_notes || 'Variable pricing'}
                      </p>
                    </div>
                  )}

                  {/* Signal suggestions */}
                  {generatedService.suggestions?.length > 0 && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-800 dark:text-amber-400">
                          Signal Suggestions
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {generatedService.suggestions.map((suggestion, i) => (
                          <li key={i} className="text-xs text-amber-700 dark:text-amber-300">
                            • {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between gap-2 pt-2 border-t">
            <Button variant="ghost" onClick={() => setStep('select')}>
              ← Choose Different Page
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateService}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
              >
                Continue to Editor
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // If embedded, just return the content directly
  if (embedded) {
    return content
  }

  // Otherwise wrap in Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--brand-primary)]" />
            Create with Signal
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Select a page from your website to generate a service definition'}
            {step === 'generating' && 'Signal is analyzing your page content...'}
            {step === 'review' && 'Review the generated service and customize as needed'}
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
