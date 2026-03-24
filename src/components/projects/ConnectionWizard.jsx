/**
 * ConnectionWizard - OAuth platform connection wizard
 * 
 * Guides users through connecting third-party platforms
 * to enable data syncing and AI features
 */
import { useState, useMemo, useCallback, useEffect } from 'react'
import { 
  ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, 
  ExternalLink, Loader2, RefreshCw, Trash2, Settings,
  Search, LineChart, Target, Users, Shield, Globe, Zap,
  ArrowRight, Link2, Unlink, Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// UI Components
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

// Google Resource Selector (GSC + GBP combined)
import GoogleResourceSelector from './GoogleResourceSelector'
import { openOAuthPopup } from '@/lib/oauth-popup'

// Platform configurations - Unified OAuth connections
// Google Business: GSC (SEO), GBP Reviews (Reputation), GBP Posts (Broadcast) - uses business connection type
// Google Workspace: Gmail, Calendar, Contacts - uses workspace connection type (in Account Settings)
// A single Facebook auth grants access to Page Posts (Broadcast), Page Reviews (Reputation), Instagram (Broadcast)
const PLATFORM_CONFIGS = {
  google: {
    id: 'google',
    name: 'Google Business',
    description: 'Connect your company Google account for Search Console & Business Profile',
    icon: Search,
    color: 'bg-blue-500',
    category: 'google',
    requiredScopes: ['webmasters.readonly', 'business.manage'],
    features: [
      'Search Console - SEO rankings & indexing',
      'Business Profile - Reviews & responses',
      'Business Profile - Posts & updates',
      'Business Profile - Local SEO optimization',
    ],
    modules: ['seo', 'seo_gbp', 'reputation', 'broadcast'],
    connectionType: 'business', // Business connection for GSC/GBP
    setupTime: '2 minutes',
    oauthProvider: 'google',
  },
  facebook: {
    id: 'facebook',
    name: 'Meta (Facebook & Instagram)',
    description: 'Connect your Meta account for Facebook and Instagram management',
    icon: Globe,
    color: 'bg-blue-600',
    category: 'meta',
    requiredScopes: ['pages_read_engagement', 'pages_manage_posts', 'instagram_basic'],
    features: [
      'Facebook Page - Posts & scheduling',
      'Facebook Page - Reviews & responses',
      'Instagram - Posts & scheduling',
    ],
    modules: ['broadcast', 'reputation'],
    setupTime: '3 minutes',
    oauthProvider: 'facebook',
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Connect your LinkedIn company page for professional content',
    icon: Users,
    color: 'bg-blue-700',
    category: 'social',
    requiredScopes: ['w_organization_social'],
    features: [
      'Company page posts',
      'Article publishing',
      'Engagement analytics',
    ],
    modules: ['broadcast'],
    setupTime: '2 minutes',
    oauthProvider: 'linkedin',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Connect your TikTok Business account for video content',
    icon: Zap,
    color: 'bg-gray-900',
    category: 'social',
    requiredScopes: ['video.upload', 'video.publish'],
    features: [
      'Video scheduling',
      'Content publishing',
      'Performance analytics',
    ],
    modules: ['broadcast'],
    setupTime: '2 minutes',
    oauthProvider: 'tiktok',
  },
  yelp: {
    id: 'yelp',
    name: 'Yelp',
    description: 'Connect your Yelp business listing for review management',
    icon: Shield,
    color: 'bg-red-500',
    category: 'reviews',
    requiredScopes: [],
    features: [
      'Review monitoring',
      'Review responses',
      'Business insights',
    ],
    modules: ['reputation'],
    setupTime: '3 minutes',
    oauthProvider: 'yelp',
    requiresSearch: true, // No OAuth, uses business search
  },
  trustpilot: {
    id: 'trustpilot',
    name: 'Trustpilot',
    description: 'Connect your Trustpilot account for review management',
    icon: Shield,
    color: 'bg-green-500',
    category: 'reviews',
    requiredScopes: [],
    features: [
      'Review monitoring',
      'Review responses',
      'Trust score tracking',
    ],
    modules: ['reputation'],
    setupTime: '3 minutes',
    oauthProvider: 'trustpilot',
    requiresApiKey: true, // Uses API key instead of OAuth
  },
}

// Category configurations
const CATEGORIES = {
  google: { label: 'Google Services', icon: Search, color: 'text-blue-500' },
  meta: { label: 'Meta Platforms', icon: Globe, color: 'text-blue-600' },
  social: { label: 'Social Media', icon: Users, color: 'text-purple-500' },
  reviews: { label: 'Review Platforms', icon: Shield, color: 'text-yellow-500' },
}

// Connection status badge
function StatusBadge({ status }) {
  const configs = {
    connected: { label: 'Connected', variant: 'default', className: 'bg-green-100 text-green-700 border-green-200' },
    pending: { label: 'Pending', variant: 'outline', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    error: { label: 'Error', variant: 'destructive', className: '' },
    expired: { label: 'Expired', variant: 'outline', className: 'bg-red-100 text-red-700 border-red-200' },
  }
  
  const config = configs[status] || configs.pending
  
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}

// Platform card component
function PlatformCard({ 
  platform, 
  connection, 
  onConnect, 
  onDisconnect, 
  onRefresh,
  isConnecting,
}) {
  const config = PLATFORM_CONFIGS[platform]
  if (!config) return null

  const Icon = config.icon
  const isConnected = connection?.status === 'connected'
  const hasError = connection?.status === 'error' || connection?.status === 'expired'

  return (
    <Card className={cn(
      "group hover:shadow-md transition-all",
      isConnected && "border-green-200 bg-green-50/50 dark:bg-green-950/10"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg text-white",
              config.color
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{config.name}</CardTitle>
              <Badge variant="outline" className="text-xs mt-1">
                {CATEGORIES[config.category]?.label}
              </Badge>
            </div>
          </div>
          
          {connection && <StatusBadge status={connection.status} />}
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground mb-3">
          {config.description}
        </p>
        
        {!isConnected && (
          <ul className="space-y-1 mb-3">
            {config.features.slice(0, 3).map((feature, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {feature}
              </li>
            ))}
          </ul>
        )}

        {isConnected && connection?.connected_at && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Connected {new Date(connection.connected_at).toLocaleDateString()}
          </p>
        )}

        {hasError && connection?.error_message && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {connection.error_message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      
      <CardFooter className="pt-2">
        {isConnected ? (
          <div className="flex items-center gap-2 w-full">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => onRefresh?.(platform)}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Sync
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onDisconnect?.(platform)}
            >
              <Unlink className="h-4 w-4" />
            </Button>
          </div>
        ) : hasError ? (
          <Button 
            variant="default" 
            size="sm" 
            className="w-full"
            onClick={() => onConnect?.(platform)}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Reconnect
          </Button>
        ) : (
          <Button 
            variant="default" 
            size="sm" 
            className="w-full"
            onClick={() => onConnect?.(platform)}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4 mr-1" />
            )}
            Connect
            <span className="text-xs ml-1 opacity-70">({config.setupTime})</span>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

// OAuth connection flow dialog
function OAuthFlowDialog({ 
  platform, 
  isOpen, 
  onClose, 
  onComplete,
  projectId,
}) {
  const [step, setStep] = useState('intro')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [properties, setProperties] = useState([])

  const config = PLATFORM_CONFIGS[platform]
  if (!config) return null

  const Icon = config.icon

  const handleStartOAuth = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Use popup-based OAuth via Portal API
      const portalApiUrl = (import.meta.env.VITE_SONOR_API_URL || import.meta.env.VITE_PORTAL_API_URL) || ''
      const modulesParam = config.modules.join(',')
      const connectionType = config.connectionType || 'business'
      
      // Get OAuth URL from backend with popup mode
      const response = await fetch(
        `${portalApiUrl}/oauth/initiate/${config.oauthProvider}?` + 
        `projectId=${projectId}&modules=${modulesParam}&connectionType=${connectionType}&popupMode=true`,
        { credentials: 'include' }
      )
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.message || 'Failed to initiate OAuth')
      }
      
      const { url } = await response.json()
      
      // Open OAuth in popup window
      const result = await openOAuthPopup(url, `oauth-${config.oauthProvider}`)
      
      if (result.success) {
        // Check if we need to show property/location selectors
        if (result.selectProperty || result.selectLocation) {
          // Close this dialog and trigger resource selection
          onComplete?.(platform, {
            connectionId: result.connectionId,
            selectProperty: result.selectProperty,
            selectLocation: result.selectLocation,
          })
        } else {
          setStep('success')
          onComplete?.(platform)
        }
      } else if (result.error !== 'OAuth window was closed') {
        setError(result.error || 'Failed to connect')
      }
      
      setIsLoading(false)

    } catch (err) {
      console.error('OAuth error:', err)
      setError(err.message || 'Failed to start authentication')
      setIsLoading(false)
    }
  }

  const handleSelectProperty = async () => {
    if (!selectedProperty) return

    setIsLoading(true)
    setError(null)

    try {
      // Save the selected property to the project connection
      const portalApiUrl = (import.meta.env.VITE_SONOR_API_URL || import.meta.env.VITE_PORTAL_API_URL) || ''
      const response = await fetch(`${portalApiUrl}/projects/${projectId}/connections/${platform}/property`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ property_id: selectedProperty }),
      })

      if (!response.ok) throw new Error('Failed to save property selection')

      setStep('success')
      onComplete?.(platform)
    } catch (err) {
      console.error('Property selection error:', err)
      setError(err.message || 'Failed to save property selection')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setStep('intro')
    setError(null)
    setSelectedProperty(null)
    setProperties([])
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn("p-2 rounded-lg text-white", config.color)}>
              <Icon className="h-5 w-5" />
            </div>
            <DialogTitle>Connect {config.name}</DialogTitle>
          </div>
        </DialogHeader>

        {step === 'intro' && (
          <>
            <DialogDescription className="text-sm">
              Connect your {config.name} account to enable automated data syncing and AI-powered insights.
            </DialogDescription>

            <div className="my-4 space-y-3">
              <h4 className="text-sm font-medium">You'll get access to:</h4>
              <ul className="space-y-2">
                {config.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-xs">
                We only request read-only access. Your data is encrypted and never shared.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleStartOAuth} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Connect with {config.oauthProvider === 'google' ? 'Google' : config.name}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'select-property' && (
          <>
            <DialogDescription className="text-sm">
              Select which property you'd like to connect to this project.
            </DialogDescription>

            <ScrollArea className="max-h-64 my-4">
              <div className="space-y-2">
                {properties.map(property => (
                  <div
                    key={property.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50",
                      selectedProperty === property.id && "border-primary bg-primary/5"
                    )}
                    onClick={() => setSelectedProperty(property.id)}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2",
                      selectedProperty === property.id 
                        ? "border-primary bg-primary" 
                        : "border-muted-foreground/50"
                    )} />
                    <div>
                      <p className="text-sm font-medium">{property.name}</p>
                      <p className="text-xs text-muted-foreground">{property.url || property.id}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('intro')}>
                Back
              </Button>
              <Button 
                onClick={handleSelectProperty} 
                disabled={!selectedProperty || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Complete Setup
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'success' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-100 mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">Connected Successfully!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your {config.name} account is now connected. Data will sync automatically.
            </p>
            <Button onClick={handleClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Main ConnectionWizard component
export default function ConnectionWizard({ 
  projectId,
  connections = [],
  onConnectionChange,
}) {
  const [selectedPlatform, setSelectedPlatform] = useState(null)
  const [isOAuthDialogOpen, setIsOAuthDialogOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  
  // Google Resource Selector state (GSC + GBP)
  const [isGoogleResourceSelectorOpen, setIsGoogleResourceSelectorOpen] = useState(false)
  const [googleConnectionId, setGoogleConnectionId] = useState(null)
  const [needsGscSelection, setNeedsGscSelection] = useState(false)
  const [needsGbpSelection, setNeedsGbpSelection] = useState(false)

  // Handle OAuth callback params (e.g., after Google OAuth returns)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const selectLocation = params.get('selectLocation')
    const selectProperty = params.get('selectProperty')
    const connId = params.get('connectionId')
    const connected = params.get('connected')

    // If we just connected Google and need property/location selection
    if ((selectLocation === 'true' || selectProperty === 'true') && connId && connected === 'google') {
      setGoogleConnectionId(connId)
      setNeedsGscSelection(selectProperty === 'true')
      setNeedsGbpSelection(selectLocation === 'true')
      setIsGoogleResourceSelectorOpen(true)

      // Clean up URL params
      const url = new URL(window.location.href)
      url.searchParams.delete('selectLocation')
      url.searchParams.delete('selectProperty')
      url.searchParams.delete('locationCount')
      url.searchParams.delete('propertyCount')
      url.searchParams.delete('connected')
      url.searchParams.delete('connectionId')
      url.searchParams.delete('modules')
      window.history.replaceState({}, '', url.toString())

      // Trigger connection refresh
      onConnectionChange?.()
    } else if (connected && connId) {
      // Just connected but no location selection needed
      toast.success(`Connected to ${PLATFORM_CONFIGS[connected]?.name || connected}!`)
      
      // Clean up URL params
      const url = new URL(window.location.href)
      url.searchParams.delete('connected')
      url.searchParams.delete('connectionId')
      url.searchParams.delete('modules')
      window.history.replaceState({}, '', url.toString())

      // Trigger connection refresh
      onConnectionChange?.()
    }
  }, [onConnectionChange])

  // Create connection lookup
  const connectionMap = useMemo(() => {
    const map = {}
    connections.forEach(c => {
      map[c.platform] = c
    })
    return map
  }, [connections])

  // Filter platforms
  const filteredPlatforms = useMemo(() => {
    let platforms = Object.values(PLATFORM_CONFIGS)

    if (selectedCategory) {
      platforms = platforms.filter(p => p.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      platforms = platforms.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      )
    }

    return platforms
  }, [selectedCategory, searchQuery])

  // Stats
  const stats = useMemo(() => ({
    total: Object.keys(PLATFORM_CONFIGS).length,
    connected: connections.filter(c => c.status === 'connected').length,
    errors: connections.filter(c => c.status === 'error' || c.status === 'expired').length,
  }), [connections])

  // Handlers
  const handleConnect = useCallback((platform) => {
    setSelectedPlatform(platform)
    setIsOAuthDialogOpen(true)
  }, [])

  const handleDisconnect = useCallback(async (platform) => {
    if (!confirm(`Are you sure you want to disconnect ${PLATFORM_CONFIGS[platform]?.name}?`)) {
      return
    }

    try {
      const portalApiUrl = (import.meta.env.VITE_SONOR_API_URL || import.meta.env.VITE_PORTAL_API_URL) || ''
      const response = await fetch(`${portalApiUrl}/projects/${projectId}/connections/${platform}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to disconnect')
      
      toast.success(`Disconnected from ${PLATFORM_CONFIGS[platform]?.name}`)
      onConnectionChange?.()
    } catch (err) {
      console.error('Disconnect error:', err)
      toast.error('Failed to disconnect platform')
    }
  }, [projectId, onConnectionChange])

  const handleRefresh = useCallback(async (platform) => {
    try {
      const portalApiUrl = (import.meta.env.VITE_SONOR_API_URL || import.meta.env.VITE_PORTAL_API_URL) || ''
      const response = await fetch(`${portalApiUrl}/projects/${projectId}/connections/${platform}/sync`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to sync')
      
      toast.success(`Syncing ${PLATFORM_CONFIGS[platform]?.name}...`)
      onConnectionChange?.()
    } catch (err) {
      console.error('Sync error:', err)
      toast.error('Failed to sync platform data')
    }
  }, [projectId, onConnectionChange])

  const handleOAuthComplete = useCallback((platform, result) => {
    setIsOAuthDialogOpen(false)
    setSelectedPlatform(null)
    
    // If property/location selection is needed, open the selector
    if (result?.connectionId && (result?.selectProperty || result?.selectLocation)) {
      setGoogleConnectionId(result.connectionId)
      setNeedsGscSelection(result.selectProperty === true)
      setNeedsGbpSelection(result.selectLocation === true)
      setIsGoogleResourceSelectorOpen(true)
    } else {
      toast.success(`Connected to ${PLATFORM_CONFIGS[platform]?.name}!`)
    }
    
    onConnectionChange?.()
  }, [onConnectionChange])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b shrink-0">
        <h2 className="text-lg font-semibold mb-1">Platform Connections</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Connect your marketing tools to enable automated data syncing and AI insights
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="p-3 bg-muted/50">
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </Card>
          <Card className="p-3 bg-green-50 dark:bg-green-950/20">
            <p className="text-xs text-green-600">Connected</p>
            <p className="text-xl font-bold text-green-600">{stats.connected}</p>
          </Card>
          <Card className={cn("p-3", stats.errors > 0 ? "bg-red-50 dark:bg-red-950/20" : "bg-muted/50")}>
            <p className={cn("text-xs", stats.errors > 0 ? "text-red-600" : "text-muted-foreground")}>
              Needs Attention
            </p>
            <p className={cn("text-xl font-bold", stats.errors > 0 && "text-red-600")}>
              {stats.errors}
            </p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search platforms..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            <Button
              variant={selectedCategory === null ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <Button
                key={key}
                variant={selectedCategory === key ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedCategory(key)}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Platform Grid */}
      <ScrollArea className="flex-1 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlatforms.map(platform => (
            <PlatformCard
              key={platform.id}
              platform={platform.id}
              connection={connectionMap[platform.id]}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onRefresh={handleRefresh}
              isConnecting={isConnecting === platform.id}
            />
          ))}
        </div>

        {filteredPlatforms.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No platforms match your search</p>
          </div>
        )}
      </ScrollArea>

      {/* OAuth Flow Dialog */}
      <OAuthFlowDialog
        platform={selectedPlatform}
        isOpen={isOAuthDialogOpen}
        onClose={() => {
          setIsOAuthDialogOpen(false)
          setSelectedPlatform(null)
        }}
        onComplete={handleOAuthComplete}
        projectId={projectId}
      />

      {/* Google Resource Selector (GSC + GBP combined, shown after Google OAuth) */}
      <GoogleResourceSelector
        isOpen={isGoogleResourceSelectorOpen}
        onClose={() => {
          setIsGoogleResourceSelectorOpen(false)
          setGoogleConnectionId(null)
          setNeedsGscSelection(false)
          setNeedsGbpSelection(false)
        }}
        connectionId={googleConnectionId}
        needsGscSelection={needsGscSelection}
        needsGbpSelection={needsGbpSelection}
        onComplete={() => {
          onConnectionChange?.()
          toast.success('Google resources configured!')
        }}
      />
    </div>
  )
}

// Named exports
export { PlatformCard, OAuthFlowDialog, PLATFORM_CONFIGS, CATEGORIES, GoogleResourceSelector }
