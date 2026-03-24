// src/components/seo/local/LocalSeoHeatMap.jsx
// Local SEO Heat Map - Google Maps integration with ranking grid overlay
// MIGRATED TO REACT QUERY - Jan 29, 2026
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSeoHeatmap, useSeoLocalGrids, useSeoHeatMapData, seoLocalKeys } from '@/hooks/seo'
import { seoApi } from '@/lib/sonor-api'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { 
  RefreshCw, 
  MapPin, 
  Settings2,
  Plus,
  Eye,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Play,
  Loader2
} from 'lucide-react'

// Color scale for rankings - brand colors for #1-3, semantic colors for lower ranks
// Returns CSS variable or fallback color
const getRankingColor = (position) => {
  if (!position) return 'var(--text-tertiary)' // Gray for not found
  if (position === 1) return 'var(--brand-primary)' // Brand primary - #1
  if (position === 2) return 'var(--brand-primary)' // Brand secondary - #2
  if (position === 3) return 'color-mix(in srgb, var(--brand-primary) 70%, var(--brand-primary) 30%)' // Blend - #3
  if (position <= 5) return 'var(--accent-yellow)' // Yellow for 4-5
  if (position <= 10) return 'var(--accent-orange)' // Orange for 6-10
  if (position <= 15) return 'var(--accent-red)' // Red for 11-15
  return 'var(--accent-red-dark)' // Dark red for 16-20
}

// Get cell opacity based on data freshness
const getCellOpacity = (crawledAt) => {
  if (!crawledAt) return 0.3
  const hoursSince = (Date.now() - new Date(crawledAt).getTime()) / (1000 * 60 * 60)
  if (hoursSince < 24) return 1.0
  if (hoursSince < 72) return 0.8
  if (hoursSince < 168) return 0.6 // 1 week
  return 0.4
}

export default function LocalSeoHeatMap({ projectId }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const overlaysRef = useRef([])
  
  const [selectedGrid, setSelectedGrid] = useState(null)
  const [selectedKeyword, setSelectedKeyword] = useState(null)
  const [heatMapData, setHeatMapData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCrawling, setIsCrawling] = useState(false)
  const [crawlStatus, setCrawlStatus] = useState(null) // { success, cellsCrawled, rankingsFound }
  const [showSettings, setShowSettings] = useState(false)
  const [selectedCell, setSelectedCell] = useState(null)
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false)
  const [showNewGridDialog, setShowNewGridDialog] = useState(false)

  // React Query hooks for local grids and heatmap data
  const queryClient = useQueryClient()
  const { data: localGridsData, isLoading: localGridsLoading, refetch: refetchLocalGrids } = useSeoLocalGrids(projectId)
  
  // API returns { grids: [...], total: N }, extract the array
  const localGrids = localGridsData?.grids || []

  // Normalize backend field (position) to frontend (ranking_position) for stats/display
  // MUST be defined before useEffect hooks that reference it
  const rank = (d) => d?.ranking_position ?? d?.position ?? null
  const heatMapList = Array.isArray(heatMapData) ? heatMapData : []

  // Load Google Maps script with API key from backend
  useEffect(() => {
    if (window.google?.maps) {
      setGoogleMapsLoaded(true)
      return
    }

    const loadGoogleMaps = async () => {
      try {
        // Get Supabase session token
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          console.error('No auth session available')
          return
        }

        // Fetch API key from backend (more secure than env var)
        const apiUrl = (import.meta.env.VITE_SONOR_API_URL || import.meta.env.VITE_PORTAL_API_URL) || 'https://api.sonor.io'
        const response = await fetch(`${apiUrl}/seo/config/maps-api-key`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
        
        if (!response.ok) {
          console.warn('Maps API key not available, heat map will be disabled')
          return
        }
        
        const { api_key } = await response.json()
        
        if (!api_key) {
          console.warn('Google Maps API key not configured, heat map will use fallback view')
          return
        }
        
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${api_key}&libraries=visualization`
        script.async = true
        script.defer = true
        script.onload = () => setGoogleMapsLoaded(true)
        script.onerror = () => console.error('Failed to load Google Maps')
        document.head.appendChild(script)
      } catch (error) {
        console.warn('Error loading Google Maps:', error)
      }
    }

    loadGoogleMaps()
  }, [])

  // Grids are now auto-fetched by React Query useSeoLocalGrids hook

  // Auto-select first grid
  useEffect(() => {
    if (localGrids?.length > 0 && !selectedGrid) {
      setSelectedGrid(localGrids[0])
      if (localGrids[0].keywords?.length > 0) {
        setSelectedKeyword(localGrids[0].keywords[0])
      }
    }
  }, [localGrids])

  // Fetch heat map data when grid/keyword changes
  useEffect(() => {
    if (selectedGrid?.id && selectedKeyword) {
      loadHeatMapData()
    }
  }, [selectedGrid?.id, selectedKeyword])

  // Load marker library for AdvancedMarkerElement (optional; fall back to legacy Marker after timeout or on error)
  const [markerLibraryLoaded, setMarkerLibraryLoaded] = useState(false)
  useEffect(() => {
    if (!googleMapsLoaded || !window.google?.maps?.importLibrary) {
      if (googleMapsLoaded) setMarkerLibraryLoaded(true)
      return
    }
    let cancelled = false
    const t = setTimeout(() => {
      if (!cancelled) setMarkerLibraryLoaded(true)
    }, 4000)
    window.google.maps.importLibrary('marker').then(() => {
      if (!cancelled) setMarkerLibraryLoaded(true)
    }).catch(() => {
      if (!cancelled) setMarkerLibraryLoaded(true)
    })
    return () => { cancelled = true; clearTimeout(t) }
  }, [googleMapsLoaded])

  useEffect(() => {
    if (googleMapsLoaded && markerLibraryLoaded && mapRef.current && selectedGrid && !mapInstanceRef.current) {
      initializeMap()
    }
  }, [googleMapsLoaded, markerLibraryLoaded, selectedGrid])

  // Update overlays when data changes OR when grid is selected (show empty grid)
  useEffect(() => {
    if (mapInstanceRef.current && selectedGrid) {
      renderGridOverlay()
    }
  }, [heatMapList, selectedGrid])

  const initializeMap = () => {
    if (!selectedGrid) return

    // Detect dark mode
    const isDarkMode = document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches

    // Theme-aware map styles
    const mapStyles = isDarkMode ? [
      { elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
      { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#1f2937' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#374151' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#111827' }] },
    ] : [
      { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
      { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
    ]

    // AdvancedMarkerElement requires mapId; omit mapId when using legacy Marker fallback
    const useAdvancedMarkers = !!window.google.maps.marker?.AdvancedMarkerElement
    const mapOptions = {
      center: { lat: Number(selectedGrid.center_lat), lng: Number(selectedGrid.center_lng) },
      zoom: 11,
      mapTypeId: 'roadmap',
      styles: mapStyles,
      // Lock the map - no zooming, panning, or interaction
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      scrollwheel: false,
      gestureHandling: 'none',
      draggable: false,
      disableDoubleClickZoom: true,
      keyboardShortcuts: false,
    }
    if (useAdvancedMarkers) {
      mapOptions.mapId = import.meta.env.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID'
    }
    const map = new window.google.maps.Map(mapRef.current, mapOptions)

    // Get brand primary color from CSS
    const brandPrimary = getComputedStyle(document.documentElement)
      .getPropertyValue('--brand-primary').trim() || '#4bbf39'
    const centerPos = { lat: Number(selectedGrid.center_lat), lng: Number(selectedGrid.center_lng) }

    // Add center marker (business location): AdvancedMarkerElement or legacy Marker
    if (useAdvancedMarkers) {
      const centerPinEl = document.createElement('div')
      centerPinEl.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="${brandPrimary}" stroke="white" stroke-width="3" opacity="0.9"/>
          <circle cx="20" cy="20" r="8" fill="white"/>
        </svg>
      `
      centerPinEl.style.cursor = 'pointer'
      const centerMarker = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position: centerPos,
        content: centerPinEl,
        title: 'Business Location',
        zIndex: 1000
      })
      overlaysRef.current.push(centerMarker)
    } else {
      overlaysRef.current.push(new window.google.maps.Marker({
        position: centerPos,
        map,
        icon: {
          url: 'data:image/svg+xml,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="${brandPrimary}" stroke="white" stroke-width="3" opacity="0.9"/>
              <circle cx="20" cy="20" r="8" fill="white"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20)
        },
        title: 'Business Location',
        zIndex: 1000
      }))
    }

    mapInstanceRef.current = map
  }

  const renderGridOverlay = () => {
    // Clear existing overlays (Marker uses setMap; AdvancedMarkerElement uses .map = null)
    overlaysRef.current.forEach(overlay => {
      if (typeof overlay.setMap === 'function') overlay.setMap(null)
      else if (overlay.map !== undefined) overlay.map = null
    })
    overlaysRef.current = []

    if (!mapInstanceRef.current || !selectedGrid) return

    const gridSize = selectedGrid.grid_size || 7
    const radiusMiles = Number(selectedGrid.radius_miles) || 10
    
    // Calculate cell size in degrees (approximate)
    const latDegreeMiles = 69.0
    const lngDegreeMiles = Math.cos(Number(selectedGrid.center_lat) * Math.PI / 180) * 69.0
    
    const totalLatDegrees = (radiusMiles * 2) / latDegreeMiles
    const totalLngDegrees = (radiusMiles * 2) / lngDegreeMiles
    
    const cellLatSize = totalLatDegrees / gridSize
    const cellLngSize = totalLngDegrees / gridSize
    
    const startLat = Number(selectedGrid.center_lat) + (radiusMiles / latDegreeMiles)
    const startLng = Number(selectedGrid.center_lng) - (radiusMiles / lngDegreeMiles)

    // Create data lookup map
    const dataMap = new Map()
    heatMapList.forEach(point => {
      dataMap.set(`${point.row_index}-${point.col_index}`, point)
    })

    // Create grid cells
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const cellData = dataMap.get(`${row}-${col}`)
        const position = cellData?.ranking_position ?? cellData?.position
        const color = getRankingColor(position)
        const opacity = getCellOpacity(cellData?.crawled_at)

        const cellLat = startLat - (row * cellLatSize) - (cellLatSize / 2)
        const cellLng = startLng + (col * cellLngSize) + (cellLngSize / 2)

        // Create rectangle for cell
        const bounds = new window.google.maps.LatLngBounds(
          new window.google.maps.LatLng(cellLat - cellLatSize/2, cellLng - cellLngSize/2),
          new window.google.maps.LatLng(cellLat + cellLatSize/2, cellLng + cellLngSize/2)
        )

        const rectangle = new window.google.maps.Rectangle({
          bounds: bounds,
          strokeColor: 'rgba(255, 255, 255, 0.8)',
          strokeOpacity: 0.8,
          strokeWeight: 1,
          fillColor: color,
          fillOpacity: opacity * 0.7,
          map: mapInstanceRef.current,
          zIndex: position ? (21 - position) : 0
        })

        // Add click listener for drill-down
        rectangle.addListener('click', () => {
          setSelectedCell({
            row,
            col,
            data: cellData,
            lat: cellLat,
            lng: cellLng
          })
        })

        // Add hover effect with brand color
        const brandPrimary = getComputedStyle(document.documentElement)
          .getPropertyValue('--brand-primary').trim() || '#4bbf39'
        
        rectangle.addListener('mouseover', () => {
          rectangle.setOptions({ 
            strokeWeight: 3,
            strokeColor: brandPrimary
          })
        })
        rectangle.addListener('mouseout', () => {
          rectangle.setOptions({ 
            strokeWeight: 1,
            strokeColor: 'rgba(255, 255, 255, 0.8)'
          })
        })

        // Add rank label in center of cell: AdvancedMarkerElement or legacy Marker
        if (position) {
          if (window.google.maps.marker?.AdvancedMarkerElement) {
            const labelEl = document.createElement('div')
            labelEl.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
                <circle cx="15" cy="15" r="12" fill="white" stroke="${color}" stroke-width="2"/>
                <text x="15" y="20" text-anchor="middle" font-size="12" font-weight="bold" fill="${color}">${position}</text>
              </svg>
            `
            const label = new window.google.maps.marker.AdvancedMarkerElement({
              map: mapInstanceRef.current,
              position: { lat: cellLat, lng: cellLng },
              content: labelEl,
              zIndex: position ? (100 - position) : 0
            })
            overlaysRef.current.push(label)
          } else {
            const label = new window.google.maps.Marker({
              position: { lat: cellLat, lng: cellLng },
              map: mapInstanceRef.current,
              icon: {
                url: 'data:image/svg+xml,' + encodeURIComponent(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
                    <circle cx="15" cy="15" r="12" fill="white" stroke="${color}" stroke-width="2"/>
                    <text x="15" y="20" text-anchor="middle" font-size="12" font-weight="bold" fill="${color}">${position}</text>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(30, 30),
                anchor: new window.google.maps.Point(15, 15)
              },
              zIndex: position ? (100 - position) : 0
            })
            overlaysRef.current.push(label)
          }
        }

        overlaysRef.current.push(rectangle)
      }
    }
  }

  const loadHeatMapData = async () => {
    if (!selectedGrid?.id || !selectedKeyword) return
    setIsLoading(true)
    try {
      const res = await seoApi.getHeatMapData(selectedGrid.id, { keyword: selectedKeyword })
      // Axios res = { data: body }; API body = { data: [...], summary }
      const list = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : []
      setHeatMapData(list)
    } catch (error) {
      console.error('Failed to load heat map data:', error)
      setHeatMapData([])
    }
    setIsLoading(false)
  }

  // Crawl rankings for the current grid
  const crawlGrid = async () => {
    if (!selectedGrid?.id) return
    
    setIsCrawling(true)
    setCrawlStatus(null)
    
    try {
      // Use the grid name as business name (or could get from GBP connection)
      const businessName = selectedGrid.name || 'Business'
      const res = await seoApi.crawlLocalGrid(selectedGrid.id, businessName, {
        keywords: selectedGrid.keywords,
        delay: 1500 // 1.5 seconds between requests for rate limiting
      })
      
      const result = res?.data || res
      setCrawlStatus({
        success: result.success,
        cellsCrawled: result.cellsCrawled,
        rankingsFound: result.rankingsFound,
        errors: result.errors?.length || 0
      })
      
      // Refresh heat map data after crawl completes
      if (selectedKeyword) {
        await loadHeatMapData()
      }
    } catch (error) {
      console.error('Failed to crawl grid:', error)
      setCrawlStatus({
        success: false,
        error: error.message
      })
    }
    
    setIsCrawling(false)
  }

  // Calculate stats from heat map data (rank and heatMapList defined earlier in component)
  const stats = {
    avgRank: heatMapList.length > 0
      ? (heatMapList.filter(d => rank(d)).reduce((sum, d) => sum + rank(d), 0) /
         heatMapList.filter(d => rank(d)).length).toFixed(1)
      : '-',
    top3Count: heatMapList.filter(d => rank(d) && rank(d) <= 3).length,
    localPackCount: heatMapList.filter(d => (d?.ranking_type ?? d?.type) === 'local_pack').length,
    notFoundCount: heatMapList.filter(d => !rank(d)).length,
    totalCells: (selectedGrid?.grid_size || 7) ** 2
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Grid Selector */}
        <Select 
          value={selectedGrid?.id || ''} 
          onValueChange={(id) => {
            const grid = localGrids.find(g => g.id === id)
            setSelectedGrid(grid)
            if (grid?.keywords?.length > 0) {
              setSelectedKeyword(grid.keywords[0])
            }
          }}
        >
          <SelectTrigger className="w-[220px] bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <MapPin className="h-4 w-4 mr-2 text-[var(--brand-primary)]" />
            <SelectValue placeholder="Select location grid" />
          </SelectTrigger>
          <SelectContent>
            {localGrids?.map(grid => (
              <SelectItem key={grid.id} value={grid.id}>
                {grid.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Keyword Selector */}
        {selectedGrid?.keywords?.length > 0 && (
          <Select value={selectedKeyword || ''} onValueChange={setSelectedKeyword}>
            <SelectTrigger className="w-[280px] bg-[var(--glass-bg)] border-[var(--glass-border)]">
              <SelectValue placeholder="Select keyword" />
            </SelectTrigger>
            <SelectContent>
              {selectedGrid.keywords.map(kw => (
                <SelectItem key={kw} value={kw}>
                  {kw}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex-1" />

        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="border-[var(--glass-border)]"
        >
          <Settings2 className="h-4 w-4 mr-2" />
          Settings
        </Button>

        <Button 
          onClick={crawlGrid}
          disabled={isCrawling || !selectedGrid}
          size="sm"
          className="bg-[var(--accent-green)] hover:opacity-90"
          title="Crawl Google Maps for current rankings at each grid point"
        >
          {isCrawling ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          {isCrawling ? 'Crawling...' : 'Crawl Rankings'}
        </Button>

        <Button 
          onClick={loadHeatMapData}
          disabled={isLoading || !selectedGrid}
          size="sm"
          variant="outline"
          className="border-[var(--glass-border)]"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>

        <Button 
          variant="outline" 
          size="sm" 
          className="border-[var(--glass-border)]"
          onClick={() => setShowNewGridDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Grid
        </Button>
      </div>

      {/* Crawl Status Alert */}
      {crawlStatus && (
        <div className={`p-3 rounded-lg flex items-center gap-3 ${
          crawlStatus.success 
            ? 'bg-green-500/10 border border-green-500/30' 
            : 'bg-red-500/10 border border-red-500/30'
        }`}>
          {crawlStatus.success ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <span className="text-sm">
            {crawlStatus.success 
              ? `Crawl complete: ${crawlStatus.cellsCrawled} cells crawled, ${crawlStatus.rankingsFound} rankings found`
              : `Crawl failed: ${crawlStatus.error || 'Unknown error'}`
            }
          </span>
          <button 
            onClick={() => setCrawlStatus(null)} 
            className="ml-auto text-sm opacity-60 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Settings Panel (collapsible) */}
      {showSettings && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Grid Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">Grid Size</label>
                <p className="text-[var(--text-primary)]">{selectedGrid?.grid_size || 7} x {selectedGrid?.grid_size || 7}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">Radius</label>
                <p className="text-[var(--text-primary)]">{selectedGrid?.radius_miles || 10} miles</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">Keywords</label>
                <p className="text-[var(--text-primary)]">{selectedGrid?.keywords?.length || 0} tracked</p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-tertiary)]">
              To modify grid settings, create a new grid with your desired configuration.
            </p>
          </CardContent>
        </Card>
      )}

      {/* New Grid Dialog (simple placeholder - would be a proper Dialog in production) */}
      {showNewGridDialog && (
        <Card className="bg-[var(--glass-bg)] border-[var(--brand-primary)] border-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Create New Grid
              <Button variant="ghost" size="sm" onClick={() => setShowNewGridDialog(false)}>×</Button>
            </CardTitle>
            <CardDescription>Set up a new ranking grid for your location</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              New grid creation coming soon. For now, grids are created when connecting your Google Business Profile.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setShowNewGridDialog(false)}
              className="w-full"
            >
              Close
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.avgRank}</p>
            <p className="text-sm text-[var(--text-secondary)]">Avg. Rank</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-[var(--brand-primary)]">{stats.top3Count}</p>
            <p className="text-sm text-[var(--text-secondary)]">Top 3 Cells</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-[var(--accent-blue)]">{stats.localPackCount}</p>
            <p className="text-sm text-[var(--text-secondary)]">Local Pack</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-[var(--accent-red)]">{stats.notFoundCount}</p>
            <p className="text-sm text-[var(--text-secondary)]">Not Found</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalCells}</p>
            <p className="text-sm text-[var(--text-secondary)]">Grid Points</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Map Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map - fixed square aspect ratio, no interaction */}
        <div className="lg:col-span-3">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] overflow-hidden">
            <div 
              ref={mapRef} 
              className="w-full aspect-square"
              style={{ maxHeight: '700px' }}
            />
            {!googleMapsLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-page)]">
                <RefreshCw className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
              </div>
            )}
          </Card>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--brand-primary)' }} />
              <span className="text-sm text-[var(--text-secondary)]">#1</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--brand-primary)' }} />
              <span className="text-sm text-[var(--text-secondary)]">2-3</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--accent-yellow)' }} />
              <span className="text-sm text-[var(--text-secondary)]">4-5</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--accent-orange)' }} />
              <span className="text-sm text-[var(--text-secondary)]">6-10</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--accent-red)' }} />
              <span className="text-sm text-[var(--text-secondary)]">11-15</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--text-tertiary)' }} />
              <span className="text-sm text-[var(--text-secondary)]">Not Found</span>
            </div>
          </div>
        </div>

        {/* Selected Cell Details */}
        <div className="lg:col-span-1">
          {selectedCell ? (
            <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-[var(--brand-primary)]" />
                  Grid Cell Details
                </CardTitle>
                <CardDescription>
                  Row {selectedCell.row + 1}, Col {selectedCell.col + 1}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedCell.data ? (
                  <>
                    <div>
                      <p className="text-sm text-[var(--text-secondary)] mb-1">Ranking Position</p>
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-3xl font-bold"
                          style={{ color: getRankingColor(selectedCell.data.ranking_position) }}
                        >
                          {selectedCell.data.ranking_position || 'N/A'}
                        </span>
                        {selectedCell.data.ranking_type && (
                          <Badge 
                            variant="outline"
                            className="capitalize"
                          >
                            {selectedCell.data.ranking_type.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-[var(--text-secondary)] mb-1">Search Location</p>
                      <p className="text-[var(--text-primary)]">
                        {selectedCell.data.search_location || 
                          `${selectedCell.lat.toFixed(4)}, ${selectedCell.lng.toFixed(4)}`}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-[var(--text-secondary)] mb-1">Last Checked</p>
                      <p className="text-[var(--text-primary)]">
                        {selectedCell.data.crawled_at 
                          ? new Date(selectedCell.data.crawled_at).toLocaleString()
                          : 'Never'
                        }
                      </p>
                    </div>

                    {selectedCell.data.competitors_above && (
                      <div>
                        <p className="text-sm text-[var(--text-secondary)] mb-2">Competitors Above</p>
                        <div className="space-y-2">
                          {selectedCell.data.competitors_above.slice(0, 5).map((comp, i) => (
                            <div 
                              key={i}
                              className="flex items-center justify-between p-2 bg-[var(--glass-bg-inset)] rounded"
                            >
                              <span className="text-sm text-[var(--text-primary)]">
                                #{comp.position} {comp.name}
                              </span>
                              {comp.rating && (
                                <span className="text-sm text-[var(--text-secondary)]">
                                  ⭐ {comp.rating}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                    <p className="text-sm text-[var(--text-secondary)]">
                      No ranking data for this cell
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
              <CardContent className="py-12 text-center">
                <Eye className="h-8 w-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-secondary)]">
                  Click a grid cell to view details
                </p>
              </CardContent>
            </Card>
          )}

          {/* Keyword Performance Summary */}
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Keyword Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedGrid?.keywords?.map(kw => (
                <div 
                  key={kw}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    kw === selectedKeyword 
                      ? 'bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]' 
                      : 'bg-[var(--glass-bg-inset)] hover:bg-[var(--glass-bg-hover)]'
                  }`}
                  onClick={() => setSelectedKeyword(kw)}
                >
                  <p className="text-sm font-medium text-[var(--text-primary)]">{kw}</p>
                  {/* Could add mini-stats per keyword here */}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
