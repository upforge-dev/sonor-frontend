// src/components/seo/local/LocationIntelligenceWizard.jsx
// Premium location intelligence wizard for generating SEO-optimized location pages
// This is the flagship feature that combines census data, map selection, streaming generation
import { useState, useEffect, useCallback } from 'react'
import { locationPagesApi } from '@/lib/sonor-api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MapPin,
  Sparkles,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  Building,
  Scale,
  Users,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Map,
  DollarSign,
  Zap,
  Eye,
  ArrowRight,
  Globe,
  Target,
  TrendingUp,
  GraduationCap,
  Home,
  Settings,
  Search,
  Layers,
  Send,
  Image,
  Code
} from 'lucide-react'
import SignalIcon from '@/components/ui/SignalIcon'
import LocationMapSelector from './LocationMapSelector'

// Tier configuration with enhanced descriptions
const TIER_CONFIG = {
  primary: { 
    label: 'Primary Market', 
    description: '1000+ words, full schema, hero image, priority indexing',
    wordCount: '1000-1500 words',
    features: ['Full entity schema', 'AI hero image', 'Priority indexing', 'Local landmarks'],
    color: 'var(--brand-primary)'
  },
  secondary: { 
    label: 'Secondary Market', 
    description: '500-800 words with local context',
    wordCount: '500-800 words',
    features: ['Service schema', 'Local context', 'Standard indexing'],
    color: 'var(--accent-blue)'
  },
  tertiary: { 
    label: 'Tertiary Market', 
    description: '300-500 words, basic coverage',
    wordCount: '300-500 words',
    features: ['Basic schema', 'Area coverage'],
    color: 'var(--text-tertiary)'
  }
}

// Step configuration
const WIZARD_STEPS = [
  { id: 1, label: 'Select Markets', icon: Map, description: 'Choose your target counties' },
  { id: 2, label: 'Assign Services', icon: Scale, description: 'Select services per market' },
  { id: 3, label: 'Configure Quality', icon: Settings, description: 'Set content tier and options' },
  { id: 4, label: 'Review & Generate', icon: Sparkles, description: 'Preview and start generation' },
  { id: 5, label: 'Generation', icon: Zap, description: 'Watch Signal create your pages' }
]

// Generation phases
const GENERATION_PHASES = [
  { id: 'context', label: 'Context', icon: MapPin },
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'schema', label: 'Schema', icon: Code },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'index', label: 'Index', icon: Send }
]

/**
 * LocationIntelligenceWizard - The flagship location page generation experience
 * 
 * Features:
 * 1. Interactive map-based county selection with Census demographics
 * 2. Service assignment per location or bulk
 * 3. Quality tier configuration (primary/secondary/tertiary)
 * 4. Real-time streaming generation with progress
 * 5. One-click Google indexing
 */
export default function LocationIntelligenceWizard({ 
  open, 
  onOpenChange, 
  projectId,
  services = [],
  existingLocations = [],
  onSuccess 
}) {
  // ============================================================================
  // STATE
  // ============================================================================
  const [step, setStep] = useState(1)
  
  // Step 1: Market Selection
  const [selectedCounties, setSelectedCounties] = useState([])
  
  // Step 2: Service Assignment
  const [selectedServices, setSelectedServices] = useState([])
  const [serviceAssignments, setServiceAssignments] = useState({}) // countyKey -> [serviceSlug]
  
  // Step 3: Quality Configuration
  const [tierAssignments, setTierAssignments] = useState({}) // countyKey -> tier
  const [defaultTier, setDefaultTier] = useState('secondary')
  const [generateHeroImages, setGenerateHeroImages] = useState(true)
  const [autoSubmitIndex, setAutoSubmitIndex] = useState(true)
  const [discoverLandmarks, setDiscoverLandmarks] = useState(true)
  const [discoverDemographics, setDiscoverDemographics] = useState(true)
  
  // Step 4 & 5: Generation
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [currentPage, setCurrentPage] = useState(null)
  const [currentPhase, setCurrentPhase] = useState(0)
  const [completedPages, setCompletedPages] = useState([])
  const [failedPages, setFailedPages] = useState([])
  const [generationLog, setGenerationLog] = useState([])
  const [streamingText, setStreamingText] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [startTime, setStartTime] = useState(null)
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  const countyKey = (county) => `${county.state}_${county.county_fips}`
  
  const totalPages = selectedCounties.reduce((sum, county) => {
    const key = countyKey(county)
    const countyServices = serviceAssignments[key] || selectedServices
    return sum + countyServices.length
  }, 0)
  
  const totalPopulation = selectedCounties.reduce((sum, c) => sum + (c.population || 0), 0)
  
  // ============================================================================
  // TIMER EFFECT
  // ============================================================================
  useEffect(() => {
    let interval
    if (isGenerating && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isGenerating, startTime])
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleCountySelectionChange = (counties) => {
    setSelectedCounties(counties)
  }
  
  const handleAddLocationsFromMap = async (counties) => {
    // Counties are already set via selection change
    // Move to next step
    if (counties.length > 0) {
      setStep(2)
    }
  }
  
  const handleServiceToggle = (serviceSlug) => {
    setSelectedServices(prev => 
      prev.includes(serviceSlug)
        ? prev.filter(s => s !== serviceSlug)
        : [...prev, serviceSlug]
    )
  }
  
  const handleSelectAllServices = () => {
    if (selectedServices.length === services.length) {
      setSelectedServices([])
    } else {
      setSelectedServices(services.map(s => s.slug))
    }
  }
  
  const handleTierChange = (countyKey, tier) => {
    setTierAssignments(prev => ({ ...prev, [countyKey]: tier }))
  }
  
  const handleGenerate = async () => {
    if (selectedCounties.length === 0 || selectedServices.length === 0) {
      setError('Please select at least one county and one service')
      return
    }
    
    setStep(5)
    setIsGenerating(true)
    setStartTime(Date.now())
    setGenerationProgress(0)
    setCompletedPages([])
    setFailedPages([])
    setGenerationLog([])
    setCurrentPhase(0)
    
    addLog('Starting location page generation...')
    
    try {
      // First, create locations in the database
      addLog(`Creating ${selectedCounties.length} locations...`)
      
      const createdLocations = []
      for (const county of selectedCounties) {
        try {
          const key = countyKey(county)
          const tier = tierAssignments[key] || defaultTier
          
          const slug = county.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/county$/i, '')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .trim()
          
          const location = await locationPagesApi.createLocation({
            project_id: projectId,
            slug,
            display_name: county.name,
            location_type: 'county',
            county: county.name.replace(/\s+County$/i, ''),
            state: county.state,
            state_abbrev: county.state,
            tier
          })
          
          createdLocations.push({
            ...location,
            county_fips: county.county_fips,
            population: county.population
          })
          
          addLog(`Created location: ${county.name}`, 'success')
          
          // Discover demographics if enabled
          if (discoverDemographics) {
            try {
              await locationPagesApi.discoverDemographics(location.id)
              addLog(`Fetched demographics for ${county.name}`)
            } catch (err) {
              addLog(`Demographics unavailable for ${county.name}`, 'warning')
            }
          }
          
          // Discover landmarks if enabled
          if (discoverLandmarks) {
            try {
              await locationPagesApi.discoverLandmarks(location.id, ['legal_government', 'community'])
              addLog(`Discovered landmarks for ${county.name}`)
            } catch (err) {
              addLog(`Landmarks unavailable for ${county.name}`, 'warning')
            }
          }
        } catch (err) {
          addLog(`Failed to create ${county.name}: ${err.message}`, 'error')
        }
      }
      
      if (createdLocations.length === 0) {
        throw new Error('No locations were created')
      }
      
      // Now generate pages
      addLog(`Generating pages for ${createdLocations.length} locations × ${selectedServices.length} services...`)
      
      const servicesToGenerate = services.filter(s => selectedServices.includes(s.slug))
      
      const result = await locationPagesApi.bulkGenerateLocationPages({
        project_id: projectId,
        location_ids: createdLocations.map(l => l.id),
        service_slugs: servicesToGenerate.map(s => ({
          slug: s.slug,
          name: s.name,
          description: s.description
        })),
        options: {
          generate_hero_images: generateHeroImages,
          auto_submit_index: autoSubmitIndex
        }
      })
      
      // Process results
      for (const pageResult of (result.results || [])) {
        if (pageResult.success) {
          setCompletedPages(prev => [...prev, {
            id: pageResult.page_id,
            location: pageResult.location_name,
            service: pageResult.service_name,
            path: pageResult.path,
            uniqueness_score: pageResult.uniqueness_score,
            url: pageResult.url
          }])
          addLog(`Generated: ${pageResult.path}`, 'success')
        } else {
          setFailedPages(prev => [...prev, {
            location: pageResult.location_name,
            service: pageResult.service_name,
            error: pageResult.error
          }])
          addLog(`Failed: ${pageResult.location_name} - ${pageResult.error}`, 'error')
        }
      }
      
      setGenerationProgress(100)
      addLog('Generation complete!')
      
      if (onSuccess) {
        onSuccess({
          created: createdLocations.length,
          pages: completedPages.length,
          failed: failedPages.length
        })
      }
    } catch (err) {
      addLog(`Generation failed: ${err.message}`, 'error')
      setError(err.message)
    }
    
    setIsGenerating(false)
  }
  
  const addLog = (message, type = 'info') => {
    setGenerationLog(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }])
  }
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }
  
  const handleNext = () => {
    if (step < 5) setStep(step + 1)
  }
  
  const canProceed = () => {
    switch (step) {
      case 1: return selectedCounties.length > 0
      case 2: return selectedServices.length > 0
      case 3: return true
      case 4: return selectedCounties.length > 0 && selectedServices.length > 0
      default: return false
    }
  }
  
  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-[var(--text-primary)]">
            <div 
              className="p-3 rounded-xl"
              style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary))' }}
            >
              <SignalIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl">Location Intelligence Platform</span>
              <p className="text-sm font-normal text-[var(--text-secondary)] mt-1">
                Generate SEO-optimized location pages with real Census data and AI
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-4 border-b border-[var(--glass-border)]">
          {WIZARD_STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = step === s.id
            const isComplete = step > s.id
            const isDisabled = step < s.id
            
            return (
              <div key={s.id} className="flex items-center">
                <button
                  onClick={() => isComplete && setStep(s.id)}
                  disabled={isDisabled}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[var(--brand-primary)] text-white'
                      : isComplete
                        ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] cursor-pointer hover:bg-[var(--brand-primary)]/30'
                        : 'bg-[var(--glass-bg-inset)] text-[var(--text-tertiary)]'
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
                </button>
                {i < WIZARD_STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 mx-2 text-[var(--text-tertiary)]" />
                )}
              </div>
            )
          })}
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="mx-6 p-4 bg-[var(--accent-red)]/10 border border-[var(--accent-red)] rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-[var(--accent-red)]" />
            <span className="text-[var(--accent-red)]">{error}</span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto"
            >
              Dismiss
            </Button>
          </div>
        )}
        
        {/* Content Area */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {/* Step 1: Market Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Select Target Markets</h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Choose counties from the map. We'll fetch real Census demographics for each.
                  </p>
                </div>
                <Badge 
                  variant="outline" 
                  className="bg-[var(--brand-primary)]/10 border-[var(--brand-primary)] text-[var(--brand-primary)]"
                >
                  {selectedCounties.length} selected
                </Badge>
              </div>
              
              <LocationMapSelector
                projectId={projectId}
                selectedCounties={selectedCounties}
                onSelectionChange={handleCountySelectionChange}
                onAddLocations={handleAddLocationsFromMap}
                maxSelections={50}
                showDemographics={true}
                allowMultiState={true}
              />
            </div>
          )}
          
          {/* Step 2: Service Assignment */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Assign Services</h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Select which services to generate pages for. Each location × service = 1 page.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline">
                    {selectedServices.length} services
                  </Badge>
                  <Badge 
                    variant="outline"
                    className="bg-[var(--brand-primary)]/10 border-[var(--brand-primary)] text-[var(--brand-primary)]"
                  >
                    {totalPages} total pages
                  </Badge>
                </div>
              </div>
              
              <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Available Services</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleSelectAllServices}
                    >
                      {selectedServices.length === services.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {services.map(service => {
                        const isSelected = selectedServices.includes(service.slug)
                        return (
                          <div
                            key={service.slug}
                            onClick={() => handleServiceToggle(service.slug)}
                            className={`p-4 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]'
                                : 'bg-[var(--glass-bg-inset)] border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox checked={isSelected} />
                              <Scale className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                              <div className="flex-1">
                                <p className="font-medium text-[var(--text-primary)]">{service.name}</p>
                                {service.description && (
                                  <p className="text-sm text-[var(--text-secondary)] line-clamp-1">
                                    {service.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
              
              {/* Summary Card */}
              <Card className="bg-gradient-to-r from-[var(--brand-primary)]/10 to-transparent border-[var(--brand-primary)]/30">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                        <span className="text-[var(--text-primary)]">{selectedCounties.length} counties</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Scale className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                        <span className="text-[var(--text-primary)]">{selectedServices.length} services</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                        <span className="text-[var(--text-primary)]">{totalPopulation.toLocaleString()} population</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold" style={{ color: 'var(--brand-primary)' }}>
                        {totalPages}
                      </span>
                      <span className="text-[var(--text-secondary)] ml-2">pages to generate</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Step 3: Quality Configuration */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Configure Quality Settings</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Set content depth and enable AI features for your location pages.
                </p>
              </div>
              
              {/* Default Tier Selection */}
              <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                <CardHeader>
                  <CardTitle className="text-base">Default Content Tier</CardTitle>
                  <CardDescription>This tier will apply to all locations unless overridden</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(TIER_CONFIG).map(([key, config]) => (
                      <div
                        key={key}
                        onClick={() => setDefaultTier(key)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          defaultTier === key
                            ? 'border-2'
                            : 'border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50'
                        }`}
                        style={{
                          borderColor: defaultTier === key ? config.color : undefined,
                          backgroundColor: defaultTier === key ? `color-mix(in srgb, ${config.color} 10%, transparent)` : undefined
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: config.color }}
                          />
                          <span className="font-medium text-[var(--text-primary)]">{config.label}</span>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] mb-3">{config.wordCount}</p>
                        <ul className="space-y-1">
                          {config.features.map((feature, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                              <CheckCircle className="h-3 w-3" style={{ color: config.color }} />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* AI Features */}
              <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <SignalIcon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                    Signal AI Features
                  </CardTitle>
                  <CardDescription>Enable advanced AI capabilities for richer content</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        discoverDemographics
                          ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]'
                          : 'bg-[var(--glass-bg-inset)] border-[var(--glass-border)]'
                      }`}
                      onClick={() => setDiscoverDemographics(!discoverDemographics)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={discoverDemographics} />
                        <Users className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">Census Demographics</p>
                          <p className="text-sm text-[var(--text-secondary)]">
                            Fetch population, income, education stats
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div 
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        discoverLandmarks
                          ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]'
                          : 'bg-[var(--glass-bg-inset)] border-[var(--glass-border)]'
                      }`}
                      onClick={() => setDiscoverLandmarks(!discoverLandmarks)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={discoverLandmarks} />
                        <Building className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">Discover Landmarks</p>
                          <p className="text-sm text-[var(--text-secondary)]">
                            Find courthouses, hospitals, local POIs
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div 
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        generateHeroImages
                          ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]'
                          : 'bg-[var(--glass-bg-inset)] border-[var(--glass-border)]'
                      }`}
                      onClick={() => setGenerateHeroImages(!generateHeroImages)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={generateHeroImages} />
                        <Image className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">AI Hero Images</p>
                          <p className="text-sm text-[var(--text-secondary)]">
                            Generate unique hero imagery with Imagen
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div 
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        autoSubmitIndex
                          ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]'
                          : 'bg-[var(--glass-bg-inset)] border-[var(--glass-border)]'
                      }`}
                      onClick={() => setAutoSubmitIndex(!autoSubmitIndex)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={autoSubmitIndex} />
                        <Send className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">Auto Index Submission</p>
                          <p className="text-sm text-[var(--text-secondary)]">
                            Submit to Google Indexing API automatically
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Step 4: Review & Generate */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Review & Generate</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Verify your configuration before generating pages.
                </p>
              </div>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                  <CardContent className="py-4 text-center">
                    <MapPin className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--brand-primary)' }} />
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{selectedCounties.length}</p>
                    <p className="text-sm text-[var(--text-tertiary)]">Counties</p>
                  </CardContent>
                </Card>
                <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                  <CardContent className="py-4 text-center">
                    <Scale className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--brand-primary)' }} />
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{selectedServices.length}</p>
                    <p className="text-sm text-[var(--text-tertiary)]">Services</p>
                  </CardContent>
                </Card>
                <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                  <CardContent className="py-4 text-center">
                    <FileText className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--brand-primary)' }} />
                    <p className="text-2xl font-bold" style={{ color: 'var(--brand-primary)' }}>{totalPages}</p>
                    <p className="text-sm text-[var(--text-tertiary)]">Pages</p>
                  </CardContent>
                </Card>
                <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                  <CardContent className="py-4 text-center">
                    <Users className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--brand-primary)' }} />
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {(totalPopulation / 1000000).toFixed(1)}M
                    </p>
                    <p className="text-sm text-[var(--text-tertiary)]">Population</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Location Preview */}
              <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Selected Markets</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {selectedCounties.map(county => (
                        <div 
                          key={countyKey(county)}
                          className="p-3 bg-[var(--glass-bg-inset)] rounded-lg flex items-center gap-2"
                        >
                          <MapPin className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {county.name}
                            </p>
                            <p className="text-xs text-[var(--text-tertiary)]">
                              {county.state} • {(county.population || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
              
              {/* Config Summary */}
              <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="py-1">
                      Tier: {TIER_CONFIG[defaultTier]?.label}
                    </Badge>
                    {discoverDemographics && (
                      <Badge variant="outline" className="py-1 bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]">
                        Census Data
                      </Badge>
                    )}
                    {discoverLandmarks && (
                      <Badge variant="outline" className="py-1 bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]">
                        Landmarks
                      </Badge>
                    )}
                    {generateHeroImages && (
                      <Badge variant="outline" className="py-1 bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]">
                        Hero Images
                      </Badge>
                    )}
                    {autoSubmitIndex && (
                      <Badge variant="outline" className="py-1 bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]">
                        Auto Index
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Step 5: Generation */}
          {step === 5 && (
            <div className="space-y-6">
              {/* Progress Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                  <CardContent className="py-4 text-center">
                    <div className="text-3xl font-bold" style={{ color: 'var(--brand-primary)' }}>
                      {completedPages.length}
                    </div>
                    <div className="text-sm text-[var(--text-tertiary)]">Completed</div>
                  </CardContent>
                </Card>
                <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                  <CardContent className="py-4 text-center">
                    <div className="text-3xl font-bold text-[var(--accent-red)]">
                      {failedPages.length}
                    </div>
                    <div className="text-sm text-[var(--text-tertiary)]">Failed</div>
                  </CardContent>
                </Card>
                <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                  <CardContent className="py-4 text-center">
                    <div className="text-3xl font-bold text-[var(--text-primary)]">
                      {totalPages - completedPages.length - failedPages.length}
                    </div>
                    <div className="text-sm text-[var(--text-tertiary)]">Remaining</div>
                  </CardContent>
                </Card>
                <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                  <CardContent className="py-4 text-center">
                    <div className="text-3xl font-bold text-[var(--text-primary)]">
                      {formatTime(elapsedTime)}
                    </div>
                    <div className="text-sm text-[var(--text-tertiary)]">Elapsed</div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">
                    {isGenerating ? 'Generating...' : 'Complete'}
                  </span>
                  <span style={{ color: 'var(--brand-primary)' }}>{Math.round(generationProgress)}%</span>
                </div>
                <Progress value={generationProgress} className="h-2" />
              </div>
              
              {/* Current Activity */}
              {isGenerating && (
                <Card className="bg-gradient-to-br from-[var(--brand-primary)]/10 to-transparent border-[var(--brand-primary)]/30">
                  <CardContent className="py-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-[var(--brand-primary)]/20 animate-ping" />
                        <div className="relative p-4 rounded-full bg-[var(--brand-primary)]/20">
                          <SignalIcon className="h-8 w-8" style={{ color: 'var(--brand-primary)' }} />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                          Signal is generating your pages...
                        </h3>
                        <p className="text-[var(--text-secondary)]">
                          This may take a few minutes for {totalPages} pages
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Log */}
              <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Generation Log</CardTitle>
                    <Badge variant="outline">{generationLog.length} events</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[200px]">
                    <div className="p-4 space-y-2 font-mono text-xs">
                      {generationLog.map((entry, i) => (
                        <div 
                          key={i}
                          className={`flex items-start gap-2 ${
                            entry.type === 'success' ? 'text-[var(--brand-primary)]' :
                            entry.type === 'error' ? 'text-[var(--accent-red)]' :
                            entry.type === 'warning' ? 'text-[var(--accent-orange)]' :
                            'text-[var(--text-tertiary)]'
                          }`}
                        >
                          <span className="opacity-50 flex-shrink-0">[{entry.timestamp}]</span>
                          <span>{entry.message}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
              
              {/* Completed Pages */}
              {completedPages.length > 0 && (
                <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Completed Pages</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[200px]">
                      <div className="divide-y divide-[var(--glass-border)]">
                        {completedPages.map((page, i) => (
                          <div key={page.id || i} className="p-4 flex items-center gap-4">
                            <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[var(--text-primary)] truncate">
                                {page.location} - {page.service}
                              </p>
                              <p className="text-sm text-[var(--text-tertiary)] truncate">
                                {page.path}
                              </p>
                            </div>
                            {page.uniqueness_score && (
                              <Badge variant="outline">
                                {Math.round(page.uniqueness_score * 100)}% unique
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
        
        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-[var(--glass-border)] flex items-center justify-between">
          <Button
            variant="outline"
            onClick={step === 1 ? () => onOpenChange(false) : handleBack}
            disabled={isGenerating}
            className="border-[var(--glass-border)]"
          >
            {step === 1 ? 'Cancel' : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </>
            )}
          </Button>
          
          <div className="flex items-center gap-4">
            {step < 4 && (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            
            {step === 4 && (
              <Button
                onClick={handleGenerate}
                disabled={!canProceed()}
                className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] hover:opacity-90"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate {totalPages} Pages
              </Button>
            )}
            
            {step === 5 && !isGenerating && (
              <Button
                onClick={() => onOpenChange(false)}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
              >
                Done
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
