/**
 * GoogleResourceSelector - Combined GSC Property + GBP Location selector
 * 
 * After Google Business OAuth, users may need to select both:
 * 1. GSC Property (Search Console site) for SEO module
 * 2. GBP Location (Business Profile location) for Reputation module
 * 
 * This component handles both in sequence.
 */
import { useState, useEffect, useCallback } from 'react'
import { Search, MapPin, CheckCircle2, AlertCircle, Loader2, Globe, ArrowRight, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { portalApi } from '@/lib/sonor-api'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'

/**
 * GoogleResourceSelector Dialog
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether dialog is open
 * @param {function} props.onClose - Called when dialog closes
 * @param {string} props.connectionId - Platform connection ID
 * @param {boolean} props.needsGscSelection - Whether GSC property selection is needed
 * @param {boolean} props.needsGbpSelection - Whether GBP location selection is needed
 * @param {function} props.onComplete - Called after all selections are complete
 */
export default function GoogleResourceSelector({
  isOpen,
  onClose,
  connectionId,
  needsGscSelection = false,
  needsGbpSelection = false,
  onComplete,
}) {
  // Determine steps needed
  const steps = []
  if (needsGscSelection) steps.push('gsc')
  if (needsGbpSelection) steps.push('gbp')
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const currentStep = steps[currentStepIndex] || null
  
  // GSC State
  const [gscProperties, setGscProperties] = useState([])
  const [selectedGscProperty, setSelectedGscProperty] = useState(null)
  const [gscLoading, setGscLoading] = useState(false)
  
  // GBP State
  const [gbpLocations, setGbpLocations] = useState([])
  const [selectedGbpLocation, setSelectedGbpLocation] = useState(null)
  const [gbpLoading, setGbpLoading] = useState(false)
  
  // Common state
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  
  // Fetch GSC properties when on GSC step
  useEffect(() => {
    if (!isOpen || !connectionId || currentStep !== 'gsc') return
    
    const fetchGscProperties = async () => {
      setGscLoading(true)
      setError(null)
      try {
        const { data } = await portalApi.get(`/oauth/connections/${connectionId}/gsc-properties`)
        setGscProperties(data.properties || [])
        // Pre-select if already selected
        if (data.selectedPropertyUrl) {
          setSelectedGscProperty(data.selectedPropertyUrl)
        }
      } catch (err) {
        console.error('Error fetching GSC properties:', err)
        setError(err.response?.data?.message || 'Failed to load Search Console properties')
      } finally {
        setGscLoading(false)
      }
    }
    
    fetchGscProperties()
  }, [isOpen, connectionId, currentStep])
  
  // Fetch GBP locations when on GBP step
  useEffect(() => {
    if (!isOpen || !connectionId || currentStep !== 'gbp') return
    
    const fetchGbpLocations = async () => {
      setGbpLoading(true)
      setError(null)
      try {
        const { data } = await portalApi.get(`/oauth/connections/${connectionId}/gbp-locations`)
        setGbpLocations(data.locations || [])
        // Pre-select if already selected
        if (data.selectedLocationId) {
          setSelectedGbpLocation(data.selectedLocationId)
        }
      } catch (err) {
        console.error('Error fetching GBP locations:', err)
        setError(err.response?.data?.message || 'Failed to load Business Profile locations')
      } finally {
        setGbpLoading(false)
      }
    }
    
    fetchGbpLocations()
  }, [isOpen, connectionId, currentStep])
  
  const handleSaveGsc = async () => {
    if (!selectedGscProperty) return
    
    setIsSaving(true)
    setError(null)
    try {
      await portalApi.post(`/oauth/connections/${connectionId}/select-property`, {
        propertyUrl: selectedGscProperty,
      })
      
      // Move to next step or complete
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1)
        toast.success('Search Console property selected')
      } else {
        toast.success('Google resources configured')
        onComplete?.()
        onClose()
      }
    } catch (err) {
      console.error('Error saving GSC property:', err)
      setError(err.response?.data?.message || 'Failed to save property selection')
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleSaveGbp = async () => {
    if (!selectedGbpLocation) return
    
    setIsSaving(true)
    setError(null)
    try {
      await portalApi.post(`/oauth/connections/${connectionId}/select-location`, {
        locationId: selectedGbpLocation,
      })
      
      // Move to next step or complete
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1)
        toast.success('Business Profile location selected')
      } else {
        toast.success('Google resources configured')
        onComplete?.()
        onClose()
      }
    } catch (err) {
      console.error('Error saving GBP location:', err)
      setError(err.response?.data?.message || 'Failed to save location selection')
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleSkip = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    } else {
      onComplete?.()
      onClose()
    }
  }
  
  const handleClose = () => {
    setCurrentStepIndex(0)
    setSelectedGscProperty(null)
    setSelectedGbpLocation(null)
    setError(null)
    onClose()
  }
  
  // Calculate progress
  const progress = steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 100
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500 text-white">
              {currentStep === 'gsc' ? (
                <Search className="h-5 w-5" />
              ) : (
                <Building2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <DialogTitle>
                {currentStep === 'gsc' && 'Select Search Console Property'}
                {currentStep === 'gbp' && 'Select Business Profile Location'}
              </DialogTitle>
              {steps.length > 1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Step {currentStepIndex + 1} of {steps.length}
                </p>
              )}
            </div>
          </div>
          
          {steps.length > 1 && (
            <Progress value={progress} className="h-1 mt-2" />
          )}
          
          <DialogDescription className="mt-2">
            {currentStep === 'gsc' && 'Choose which Search Console property to use for SEO insights.'}
            {currentStep === 'gbp' && 'Choose which Business Profile location to use for reviews and local SEO.'}
          </DialogDescription>
        </DialogHeader>
        
        {/* GSC Property Selection */}
        {currentStep === 'gsc' && (
          <>
            {gscLoading ? (
              <div className="py-8 space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : gscProperties.length === 0 ? (
              <Alert>
                <Globe className="h-4 w-4" />
                <AlertDescription>
                  No Search Console properties found. Add your site to Search Console first.
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="max-h-[300px] -mx-6 px-6">
                <div className="space-y-2">
                  {gscProperties.map((property) => (
                    <button
                      key={property.siteUrl}
                      type="button"
                      onClick={() => setSelectedGscProperty(property.siteUrl)}
                      className={cn(
                        "w-full p-4 rounded-lg border text-left transition-all",
                        selectedGscProperty === property.siteUrl
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                          : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{property.siteUrl}</p>
                          {property.permissionLevel && (
                            <p className="text-xs text-muted-foreground">{property.permissionLevel}</p>
                          )}
                        </div>
                        {selectedGscProperty === property.siteUrl && (
                          <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
            
            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={handleSkip}>
                Skip
              </Button>
              <Button
                onClick={handleSaveGsc}
                disabled={!selectedGscProperty || isSaving || gscLoading}
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {steps.length > 1 && currentStepIndex < steps.length - 1 ? (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  'Complete'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
        
        {/* GBP Location Selection */}
        {currentStep === 'gbp' && (
          <>
            {gbpLoading ? (
              <div className="py-8 space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : gbpLocations.length === 0 ? (
              <Alert>
                <Building2 className="h-4 w-4" />
                <AlertDescription>
                  No Business Profile locations found. Create a Business Profile first.
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="max-h-[300px] -mx-6 px-6">
                <div className="space-y-2">
                  {gbpLocations.map((location) => (
                    <button
                      key={location.locationId}
                      type="button"
                      onClick={() => setSelectedGbpLocation(location.locationId)}
                      className={cn(
                        "w-full p-4 rounded-lg border text-left transition-all",
                        selectedGbpLocation === location.locationId
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                          : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{location.title}</p>
                          {location.address && (
                            <p className="text-xs text-muted-foreground mt-0.5">{location.address}</p>
                          )}
                          {location.websiteUrl && (
                            <p className="text-xs text-blue-500 truncate mt-1">{location.websiteUrl}</p>
                          )}
                        </div>
                        {selectedGbpLocation === location.locationId && (
                          <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
            
            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={handleSkip}>
                Skip
              </Button>
              <Button
                onClick={handleSaveGbp}
                disabled={!selectedGbpLocation || isSaving || gbpLoading}
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Complete
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
