/**
 * GscPropertySelector - Google Search Console property selection dialog
 *
 * Shown after OAuth when multiple GSC properties are available.
 * Users select which property (site URL) to use for this project.
 */
import { useState, useEffect } from 'react'
import { Search, CheckCircle2, AlertCircle, Loader2, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { portalApi } from '@/lib/sonor-api'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * GscPropertySelector Dialog
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether dialog is open
 * @param {function} props.onClose - Called when dialog closes
 * @param {string} props.connectionId - Platform connection ID
 * @param {function} props.onPropertySelected - Called after property is selected
 */
export default function GscPropertySelector({
  isOpen,
  onClose,
  connectionId,
  onPropertySelected,
}) {
  const [properties, setProperties] = useState([])
  const [selectedPropertyUrl, setSelectedPropertyUrl] = useState(null)
  const [currentSelection, setCurrentSelection] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOpen || !connectionId) return

    const fetchProperties = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const { data } = await portalApi.get(`/oauth/connections/${connectionId}/gsc-properties`)
        setProperties(data.properties || [])
        setCurrentSelection(data.selectedPropertyUrl || null)
        setSelectedPropertyUrl(data.selectedPropertyUrl || null)
      } catch (err) {
        console.error('Error fetching GSC properties:', err)
        setError(err.response?.data?.message || err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProperties()
  }, [isOpen, connectionId])

  const handleSelectProperty = async () => {
    if (!selectedPropertyUrl) return

    setIsSaving(true)
    setError(null)
    try {
      const { data: result } = await portalApi.post(
        `/oauth/connections/${connectionId}/select-property`,
        { propertyUrl: selectedPropertyUrl }
      )
      toast.success('Search Console property connected')
      onPropertySelected?.(result)
      onClose()
    } catch (err) {
      console.error('Error selecting property:', err)
      setError(err.response?.data?.message || err.message)
      toast.error('Failed to save property selection')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500 text-white">
              <Search className="h-5 w-5" />
            </div>
            <DialogTitle>Select Search Console Property</DialogTitle>
          </div>
          <DialogDescription>
            Choose which Google Search Console property to connect to this project.
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
        ) : properties.length === 0 ? (
          <Alert>
            <Globe className="h-4 w-4" />
            <AlertDescription>
              No Search Console properties found. Make sure the site is verified in
              Google Search Console and you have at least read access.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <ScrollArea className="max-h-80">
              <div className="space-y-2 pr-4">
                {properties.map((prop) => (
                  <div
                    key={prop.siteUrl}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                      'hover:bg-muted/50',
                      selectedPropertyUrl === prop.siteUrl
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border'
                    )}
                    onClick={() => setSelectedPropertyUrl(prop.siteUrl)}
                  >
                    <div
                      className={cn(
                        'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                        selectedPropertyUrl === prop.siteUrl
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/30'
                      )}
                    >
                      {selectedPropertyUrl === prop.siteUrl && (
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{prop.siteUrl}</p>
                        {currentSelection === prop.siteUrl && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            Current
                          </Badge>
                        )}
                      </div>
                      {prop.permissionLevel && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {prop.permissionLevel.replace('site', '')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {properties.length} propert{properties.length !== 1 ? 'ies' : 'y'} found
            </p>
          </>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose}>
            {currentSelection ? 'Cancel' : 'Skip for Now'}
          </Button>
          <Button
            onClick={handleSelectProperty}
            disabled={!selectedPropertyUrl || isSaving || isLoading}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {currentSelection && selectedPropertyUrl !== currentSelection
                  ? 'Change Property'
                  : 'Confirm Selection'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
