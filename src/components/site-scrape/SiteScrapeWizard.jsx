import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import {
  Globe,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  FileText,
  Image,
  Palette,
  Layout,
  Download,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { portalApi } from '@/lib/sonor-api'
import { ScrapeProgressView } from './ScrapeProgressView'
import { ScrapedPagesView } from './ScrapedPagesView'
import { ScrapedImagesGallery } from './ScrapedImagesGallery'
import { BrandExtractView } from './BrandExtractView'
import { ScrapeReviewView } from './ScrapeReviewView'

const STEPS = [
  { id: 1, label: 'Enter URL', icon: Globe },
  { id: 2, label: 'Scanning', icon: Loader2 },
  { id: 3, label: 'Pages', icon: FileText },
  { id: 4, label: 'Images', icon: Image },
  { id: 5, label: 'Brand', icon: Palette },
  { id: 6, label: 'Review', icon: Layout },
]

function StepIndicator({ currentStep, steps }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => {
        const Icon = step.icon
        return (
          <React.Fragment key={step.id}>
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all',
                currentStep === step.id
                  ? 'bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white shadow-lg'
                  : currentStep > step.id
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'bg-[var(--surface-secondary)] text-[var(--text-tertiary)]'
              )}
              title={step.label}
            >
              {currentStep > step.id ? (
                <Check className="h-5 w-5" />
              ) : step.id === 2 && currentStep === 2 ? (
                <Icon className="h-5 w-5 animate-spin" />
              ) : (
                <Icon className="h-5 w-5" />
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-8 transition-colors',
                  currentStep > step.id
                    ? 'bg-[var(--brand-primary)]'
                    : 'bg-[var(--glass-border)]'
                )}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export function SiteScrapeWizard({ open, onOpenChange, projectId }) {
  const { currentProject, currentOrg } = useStore()
  const [step, setStep] = useState(1)
  const [url, setUrl] = useState('')
  const [scrapeOptions, setScrapeOptions] = useState({
    maxPages: 50,
    includeImages: true,
    downloadImages: true,
    extractBrand: true,
    respectRobotsTxt: true,
  })
  const [scrapeId, setScrapeId] = useState(null)
  const [scrapeData, setScrapeData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pollingInterval, setPollingInterval] = useState(null)

  const effectiveProjectId = projectId || currentProject?.id

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep(1)
      setUrl('')
      setScrapeId(null)
      setScrapeData(null)
      setError(null)
      if (pollingInterval) {
        clearInterval(pollingInterval)
        setPollingInterval(null)
      }
    }
  }, [open])

  // Start scrape
  const handleStartScrape = async () => {
    if (!url) {
      toast.error('Please enter a URL')
      return
    }

    // Validate URL
    let parsedUrl
    try {
      parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`)
    } catch {
      toast.error('Please enter a valid URL')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await portalApi.post('/site-scrape/start', {
        url: parsedUrl.href,
        projectId: effectiveProjectId,
        orgId: currentOrg?.id,
        options: scrapeOptions,
      })

      if (response.success && response.scrapeId) {
        setScrapeId(response.scrapeId)
        setStep(2) // Move to scanning step
        startPolling(response.scrapeId)
      } else {
        throw new Error(response.error || 'Failed to start scrape')
      }
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Poll for scrape status
  const startPolling = (id) => {
    const interval = setInterval(async () => {
      try {
        const status = await portalApi.get(`/site-scrape/${id}/status`)
        setScrapeData(status)

        // Check if scrape is complete
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(interval)
          setPollingInterval(null)

          if (status.status === 'completed') {
            setStep(3) // Move to pages review
            toast.success('Site scrape completed!')
          } else {
            setError(status.error || 'Scrape failed')
            toast.error('Scrape failed: ' + (status.error || 'Unknown error'))
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 2000) // Poll every 2 seconds

    setPollingInterval(interval)
  }

  // Fetch full scrape data
  const fetchScrapeData = useCallback(async () => {
    if (!scrapeId) return

    try {
      const data = await portalApi.get(`/site-scrape/${scrapeId}`)
      setScrapeData(data)
    } catch (err) {
      console.error('Failed to fetch scrape data:', err)
    }
  }, [scrapeId])

  // Navigation
  const handleNext = () => {
    if (step < 6) {
      setStep(step + 1)
      if (step === 2 && scrapeId) {
        fetchScrapeData() // Fetch full data when leaving scanning step
      }
    }
  }

  const handleBack = () => {
    if (step > 1 && step !== 2) {
      setStep(step - 1)
    }
  }

  const handleFinish = () => {
    toast.success('Site content imported successfully!')
    onOpenChange(false)
  }

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] mb-4">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                Scrape Existing Website
              </h3>
              <p className="text-[var(--text-secondary)] mt-2">
                Enter the URL of the existing site to extract content, images, and brand elements.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="url">Website URL</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => url && window.open(url.startsWith('http') ? url : `https://${url}`, '_blank')}
                    disabled={!url}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-[var(--glass-border)]">
                <Label>Scrape Options</Label>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="includeImages"
                    checked={scrapeOptions.includeImages}
                    onCheckedChange={(checked) =>
                      setScrapeOptions((prev) => ({ ...prev, includeImages: checked }))
                    }
                  />
                  <Label htmlFor="includeImages" className="font-normal cursor-pointer">
                    Extract images from pages
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="downloadImages"
                    checked={scrapeOptions.downloadImages}
                    onCheckedChange={(checked) =>
                      setScrapeOptions((prev) => ({ ...prev, downloadImages: checked }))
                    }
                    disabled={!scrapeOptions.includeImages}
                  />
                  <Label
                    htmlFor="downloadImages"
                    className={cn('font-normal cursor-pointer', !scrapeOptions.includeImages && 'opacity-50')}
                  >
                    Download and store images locally
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="extractBrand"
                    checked={scrapeOptions.extractBrand}
                    onCheckedChange={(checked) =>
                      setScrapeOptions((prev) => ({ ...prev, extractBrand: checked }))
                    }
                  />
                  <Label htmlFor="extractBrand" className="font-normal cursor-pointer">
                    Extract brand elements (colors, fonts, identity)
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="respectRobotsTxt"
                    checked={scrapeOptions.respectRobotsTxt}
                    onCheckedChange={(checked) =>
                      setScrapeOptions((prev) => ({ ...prev, respectRobotsTxt: checked }))
                    }
                  />
                  <Label htmlFor="respectRobotsTxt" className="font-normal cursor-pointer">
                    Respect robots.txt rules
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <Label htmlFor="maxPages" className="min-w-fit">
                    Max pages:
                  </Label>
                  <Input
                    id="maxPages"
                    type="number"
                    min={1}
                    max={200}
                    value={scrapeOptions.maxPages}
                    onChange={(e) =>
                      setScrapeOptions((prev) => ({ ...prev, maxPages: parseInt(e.target.value) || 50 }))
                    }
                    className="w-24"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleStartScrape}
                disabled={!url || isLoading}
                className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    Start Scraping
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )

      case 2:
        return (
          <ScrapeProgressView
            scrapeId={scrapeId}
            scrapeData={scrapeData}
            onComplete={() => setStep(3)}
          />
        )

      case 3:
        return (
          <ScrapedPagesView
            scrapeId={scrapeId}
            scrapeData={scrapeData}
            onRefresh={fetchScrapeData}
          />
        )

      case 4:
        return (
          <ScrapedImagesGallery
            scrapeId={scrapeId}
            scrapeData={scrapeData}
            onRefresh={fetchScrapeData}
          />
        )

      case 5:
        return (
          <BrandExtractView
            scrapeId={scrapeId}
            scrapeData={scrapeData}
            onRefresh={fetchScrapeData}
          />
        )

      case 6:
        return (
          <ScrapeReviewView
            scrapeId={scrapeId}
            scrapeData={scrapeData}
            onFinish={handleFinish}
          />
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Site Content Scraper</DialogTitle>
          <DialogDescription>
            Extract content, images, and brand elements from an existing website
          </DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={step} steps={STEPS} />

        <div className="flex-1 overflow-y-auto px-1">{renderStepContent()}</div>

        {step > 2 && step < 6 && (
          <div className="flex justify-between pt-4 border-t border-[var(--glass-border)]">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default SiteScrapeWizard
