/**
 * ProjectIntegrationsDialog - Manage third-party integrations for projects
 * 
 * Includes:
 * - Square OAuth (multi-merchant payments)
 * - Future: OpenPhone, Shopify, etc.
 */
import { useState, useEffect } from 'react'
import { 
  Loader2, Check, X, ExternalLink, CreditCard, 
  Phone, ShoppingBag, RefreshCw, Unplug, Plug,
  MapPin, AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../ui/dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Separator } from '../ui/separator'
import { Alert, AlertDescription } from '../ui/alert'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from '../ui/alert-dialog'

import { configApi } from '../../lib/sonor-api'

const ProjectIntegrationsDialog = ({ open, onOpenChange, project }) => {
  // Square OAuth state
  const [squareStatus, setSquareStatus] = useState(null)
  const [squareLocations, setSquareLocations] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [isLoadingSquare, setIsLoadingSquare] = useState(false)
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isSavingLocation, setIsSavingLocation] = useState(false)

  // Check for OAuth callback results in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('square_connected') === 'true') {
      toast.success('Square account connected successfully!')
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('square_error')) {
      toast.error(`Square connection failed: ${params.get('square_error')}`)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Load Square status when dialog opens
  useEffect(() => {
    if (open && project?.id) {
      loadSquareStatus()
    }
  }, [open, project?.id])

  // Load Square locations when connected
  useEffect(() => {
    if (squareStatus?.isConnected && project?.id) {
      loadSquareLocations()
    }
  }, [squareStatus?.isConnected, project?.id])

  const loadSquareStatus = async () => {
    setIsLoadingSquare(true)
    try {
      const status = await configApi.getSquareStatus(project.id)
      setSquareStatus(status)
      setSelectedLocation(status.locationId)
    } catch (err) {
      console.error('Failed to load Square status:', err)
      setSquareStatus({ isConnected: false })
    } finally {
      setIsLoadingSquare(false)
    }
  }

  const loadSquareLocations = async () => {
    setIsLoadingLocations(true)
    try {
      const { locations } = await configApi.getSquareLocations(project.id)
      setSquareLocations(locations || [])
    } catch (err) {
      console.error('Failed to load Square locations:', err)
      toast.error('Failed to load Square locations')
    } finally {
      setIsLoadingLocations(false)
    }
  }

  const handleConnectSquare = async () => {
    try {
      // This will redirect to Square OAuth
      await configApi.connectSquare(project.id)
    } catch (err) {
      toast.error('Failed to initiate Square connection')
    }
  }

  const handleDisconnectSquare = async () => {
    setIsDisconnecting(true)
    try {
      await configApi.disconnectSquare(project.id)
      setSquareStatus({ isConnected: false })
      setSquareLocations([])
      setSelectedLocation(null)
      toast.success('Square account disconnected')
    } catch (err) {
      toast.error('Failed to disconnect Square')
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleSaveLocation = async () => {
    if (!selectedLocation) return
    
    setIsSavingLocation(true)
    try {
      await configApi.setSquareLocation(project.id, selectedLocation)
      toast.success('Square location updated')
    } catch (err) {
      toast.error('Failed to update location')
    } finally {
      setIsSavingLocation(false)
    }
  }

  if (!project) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug className="w-5 h-5" />
            Integrations
          </DialogTitle>
          <DialogDescription>
            Connect third-party services for {project.title || 'this project'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Square Integration */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Square Payments</CardTitle>
                    <CardDescription>Accept payments via Square</CardDescription>
                  </div>
                </div>
                {isLoadingSquare ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : squareStatus?.isConnected ? (
                  <Badge variant="default" className="bg-green-600">
                    <Check className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not Connected</Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {squareStatus?.isConnected ? (
                <>
                  {/* Connected Info */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Merchant ID</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      {squareStatus.merchantId || 'N/A'}
                    </code>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Environment</span>
                    <Badge variant={squareStatus.environment === 'production' ? 'default' : 'secondary'}>
                      {squareStatus.environment || 'sandbox'}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Location Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Payment Location
                    </label>
                    
                    {isLoadingLocations ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading locations...
                      </div>
                    ) : squareLocations.length > 0 ? (
                      <div className="flex gap-2">
                        <Select 
                          value={selectedLocation || ''} 
                          onValueChange={setSelectedLocation}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select a location" />
                          </SelectTrigger>
                          <SelectContent>
                            {squareLocations.map(loc => (
                              <SelectItem key={loc.id} value={loc.id}>
                                {loc.name} 
                                {loc.status !== 'ACTIVE' && (
                                  <span className="text-muted-foreground ml-2">
                                    ({loc.status.toLowerCase()})
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          size="sm"
                          onClick={handleSaveLocation}
                          disabled={isSavingLocation || !selectedLocation || selectedLocation === squareStatus.locationId}
                        >
                          {isSavingLocation ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Save'
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Alert>
                        <AlertTriangle className="w-4 h-4" />
                        <AlertDescription>
                          No locations found. Create a location in Square Dashboard.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <Separator />

                  {/* Disconnect Button */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadSquareLocations}
                      disabled={isLoadingLocations}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingLocations ? 'animate-spin' : ''}`} />
                      Refresh Locations
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isDisconnecting}>
                          {isDisconnecting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Unplug className="w-4 h-4 mr-2" />
                          )}
                          Disconnect
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Disconnect Square?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will disconnect Square payments for this project. 
                            Existing invoices won't be affected, but new payments cannot be processed 
                            until reconnected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDisconnectSquare}>
                            Disconnect
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              ) : (
                <>
                  {/* Not Connected State */}
                  <p className="text-sm text-muted-foreground">
                    Connect your Square account to accept credit card payments for invoices 
                    and proposals. Payments will go directly to your Square account.
                  </p>
                  
                  <Button onClick={handleConnectSquare} className="w-full">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Connect Square Account
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    You'll be redirected to Square to authorize access
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* OpenPhone Integration - Coming Soon */}
          <Card className="opacity-60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">OpenPhone</CardTitle>
                    <CardDescription>Business phone & SMS</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Shopify Integration - Coming Soon */}
          <Card className="opacity-60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Shopify</CardTitle>
                    <CardDescription>E-commerce & products</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
            </CardHeader>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ProjectIntegrationsDialog
