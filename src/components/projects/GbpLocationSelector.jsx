/**
 * GbpLocationSelector - Google Business Profile location selection dialog
 *
 * Shown after OAuth when multiple GBP locations are available.
 * Users select which location to use for this project.
 */
import { useState, useEffect } from 'react'
import {
  MapPin, CheckCircle2, AlertCircle, Loader2,
  Building2, Globe, Phone, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { portalApi } from '@/lib/sonor-api'

// UI Components
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * GbpLocationSelector Dialog
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether dialog is open
 * @param {function} props.onClose - Called when dialog closes
 * @param {string} props.connectionId - Platform connection ID
 * @param {function} props.onLocationSelected - Called after location is selected
 */
export default function GbpLocationSelector({
  isOpen,
  onClose,
  connectionId,
  onLocationSelected,
}) {
  const [locations, setLocations] = useState([])
  const [selectedLocationId, setSelectedLocationId] = useState(null)
  const [currentSelection, setCurrentSelection] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  // Fetch locations when dialog opens
  useEffect(() => {
    if (!isOpen || !connectionId) return

    const fetchLocations = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const { data } = await portalApi.get(`/oauth/connections/${connectionId}/gbp-locations`)
        setLocations(data.locations || [])
        setCurrentSelection(data.selectedLocationId || null)
        setSelectedLocationId(data.selectedLocationId || null)
      } catch (err) {
        console.error('Error fetching GBP locations:', err)
        setError(err.response?.data?.message || err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLocations()
  }, [isOpen, connectionId])

  // Handle location selection
  const handleSelectLocation = async () => {
    if (!selectedLocationId) return

    setIsSaving(true)
    setError(null)

    try {
      const { data: result } = await portalApi.post(
        `/oauth/connections/${connectionId}/select-location`,
        { locationId: selectedLocationId }
      )
      toast.success(`Selected: ${result.selectedLocation?.title}`)
      onLocationSelected?.(result.selectedLocation)
      onClose()
    } catch (err) {
      console.error('Error selecting location:', err)
      setError(err.response?.data?.message || err.message)
      toast.error('Failed to save location selection')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    // If user closes without selecting, that's okay - they can select later
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500 text-white">
              <MapPin className="h-5 w-5" />
            </div>
            <DialogTitle>Select Business Location</DialogTitle>
          </div>
          <DialogDescription>
            Choose which Google Business Profile location to connect to this project.
            You can change this later in settings.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
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
        ) : locations.length === 0 ? (
          <Alert>
            <Building2 className="h-4 w-4" />
            <AlertDescription>
              No Google Business Profile locations found. Make sure you have access to 
              at least one verified business location in Google Business Profile.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <ScrollArea className="max-h-80">
              <div className="space-y-2 pr-4">
                {locations.map((location) => (
                  <div
                    key={location.locationId}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      "hover:bg-muted/50",
                      selectedLocationId === location.locationId 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-border"
                    )}
                    onClick={() => setSelectedLocationId(location.locationId)}
                  >
                    <div className={cn(
                      "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                      selectedLocationId === location.locationId 
                        ? "border-primary bg-primary" 
                        : "border-muted-foreground/30"
                    )}>
                      {selectedLocationId === location.locationId && (
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {location.title}
                        </p>
                        {currentSelection === location.locationId && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            Current
                          </Badge>
                        )}
                      </div>
                      
                      {location.address && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          <MapPin className="inline h-3 w-3 mr-1" />
                          {location.address}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-3 mt-1.5">
                        {location.phoneNumber && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {location.phoneNumber}
                          </span>
                        )}
                        {location.websiteUrl && (
                          <a 
                            href={location.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Globe className="h-3 w-3" />
                            Website
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <p className="text-xs text-muted-foreground">
              {locations.length} location{locations.length !== 1 ? 's' : ''} found
            </p>
          </>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose}>
            {currentSelection ? 'Cancel' : 'Skip for Now'}
          </Button>
          <Button 
            onClick={handleSelectLocation}
            disabled={!selectedLocationId || isSaving || isLoading}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {currentSelection && selectedLocationId !== currentSelection 
                  ? 'Change Location' 
                  : 'Confirm Selection'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Export a hook to handle OAuth callback params
export function useGbpLocationSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const [connectionId, setConnectionId] = useState(null)

  // Check URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const selectLocation = params.get('selectLocation')
    const connId = params.get('connectionId')
    const connected = params.get('connected')

    // If we just connected Google and need location selection
    if (selectLocation === 'true' && connId && connected === 'google') {
      setConnectionId(connId)
      setIsOpen(true)

      // Clean up URL params
      const url = new URL(window.location.href)
      url.searchParams.delete('selectLocation')
      url.searchParams.delete('locationCount')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  const handleClose = () => {
    setIsOpen(false)
    setConnectionId(null)
  }

  return {
    isOpen,
    connectionId,
    onClose: handleClose,
    openForConnection: (connId) => {
      setConnectionId(connId)
      setIsOpen(true)
    },
  }
}
