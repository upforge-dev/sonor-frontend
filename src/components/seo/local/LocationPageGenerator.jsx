// src/components/seo/local/LocationPageGenerator.jsx
// Modal for generating location pages with Signal
import { useState, useEffect } from 'react'
import { locationPagesApi } from '@/lib/sonor-api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Plus,
  Trash2
} from 'lucide-react'
import SignalIcon from '@/components/ui/SignalIcon'

// Tier configuration
const TIER_CONFIG = {
  primary: { 
    label: 'Primary', 
    description: '1000+ words, full schema', 
    color: 'bg-[var(--brand-primary)]'
  },
  secondary: { 
    label: 'Secondary', 
    description: '500-800 words', 
    color: 'bg-[var(--accent-blue)]'
  },
  tertiary: { 
    label: 'Tertiary', 
    description: '300-500 words', 
    color: 'bg-[var(--text-tertiary)]'
  }
}

export default function LocationPageGenerator({ 
  open, 
  onOpenChange, 
  projectId,
  services = [],
  onSuccess 
}) {
  const [step, setStep] = useState(1)
  const [locations, setLocations] = useState([])
  const [selectedLocations, setSelectedLocations] = useState([])
  const [selectedServices, setSelectedServices] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationResults, setGenerationResults] = useState([])
  const [error, setError] = useState(null)

  // New location form
  const [newLocation, setNewLocation] = useState({
    display_name: '',
    county: '',
    city: '',
    state: '',
    state_abbrev: '',
    location_type: 'county',
    tier: 'secondary'
  })

  // Load existing locations
  useEffect(() => {
    if (open && projectId) {
      loadLocations()
    }
  }, [open, projectId])

  const loadLocations = async () => {
    setIsLoading(true)
    try {
      const data = await locationPagesApi.getLocations(projectId)
      setLocations(data || [])
    } catch (err) {
      console.error('Failed to load locations:', err)
      setError('Failed to load locations')
    }
    setIsLoading(false)
  }

  const handleAddLocation = async () => {
    if (!newLocation.display_name || !newLocation.state) {
      return
    }

    try {
      const slug = newLocation.display_name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')

      const created = await locationPagesApi.createLocation({
        project_id: projectId,
        slug,
        display_name: newLocation.display_name,
        location_type: newLocation.location_type,
        city: newLocation.city || null,
        county: newLocation.county || null,
        state: newLocation.state,
        state_abbrev: newLocation.state_abbrev,
        tier: newLocation.tier
      })

      setLocations([...locations, created])
      setNewLocation({
        display_name: '',
        county: '',
        city: '',
        state: '',
        state_abbrev: '',
        location_type: 'county',
        tier: 'secondary'
      })
    } catch (err) {
      console.error('Failed to create location:', err)
      setError('Failed to create location')
    }
  }

  const handleDiscoverLandmarks = async (locationId) => {
    try {
      const landmarks = await locationPagesApi.discoverLandmarks(locationId, ['legal_government', 'community'])
      console.log('Discovered landmarks:', landmarks)
      // Could show a preview modal here
    } catch (err) {
      console.error('Failed to discover landmarks:', err)
    }
  }

  const handleSelectLocation = (locationId) => {
    setSelectedLocations(prev => 
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    )
  }

  const handleSelectService = (serviceSlug) => {
    setSelectedServices(prev =>
      prev.includes(serviceSlug)
        ? prev.filter(s => s !== serviceSlug)
        : [...prev, serviceSlug]
    )
  }

  const handleSelectAll = (type) => {
    if (type === 'locations') {
      setSelectedLocations(
        selectedLocations.length === locations.length
          ? []
          : locations.map(l => l.id)
      )
    } else {
      setSelectedServices(
        selectedServices.length === services.length
          ? []
          : services.map(s => s.slug)
      )
    }
  }

  const handleGenerate = async () => {
    if (selectedLocations.length === 0 || selectedServices.length === 0) {
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setGenerationResults([])
    setStep(3)

    try {
      const servicesToGenerate = services.filter(s => selectedServices.includes(s.slug))
      
      const result = await locationPagesApi.bulkGenerateLocationPages({
        project_id: projectId,
        location_ids: selectedLocations,
        service_slugs: servicesToGenerate.map(s => ({
          slug: s.slug,
          name: s.name,
          description: s.description
        }))
      })

      setGenerationResults(result.results || [])
      setGenerationProgress(100)
      
      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err) {
      console.error('Failed to generate pages:', err)
      setError('Failed to generate pages: ' + err.message)
    }
    setIsGenerating(false)
  }

  const totalPages = selectedLocations.length * selectedServices.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--text-primary)]">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
            >
              <SignalIcon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
            </div>
            Generate Location Pages
          </DialogTitle>
          <DialogDescription className="text-[var(--text-secondary)]">
            Create SEO-optimized location pages with Signal AI
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 py-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step >= s 
                    ? 'bg-[var(--brand-primary)] text-white' 
                    : 'bg-[var(--glass-bg-inset)] text-[var(--text-tertiary)]'
                  }`}
              >
                {step > s ? <CheckCircle className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <ChevronRight className="h-4 w-4 mx-2 text-[var(--text-tertiary)]" />
              )}
            </div>
          ))}
          <div className="ml-4 text-sm text-[var(--text-secondary)]">
            {step === 1 && 'Select Locations'}
            {step === 2 && 'Select Services'}
            {step === 3 && 'Generating Pages'}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[var(--accent-red)]/10 border border-[var(--accent-red)] rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-[var(--accent-red)]" />
            <span className="text-[var(--accent-red)]">{error}</span>
          </div>
        )}

        {/* Step 1: Select Locations */}
        {step === 1 && (
          <div className="space-y-4">
            <Tabs defaultValue="existing">
              <TabsList className="bg-[var(--glass-bg-inset)]">
                <TabsTrigger value="existing">Existing Locations</TabsTrigger>
                <TabsTrigger value="add">Add New</TabsTrigger>
              </TabsList>

              <TabsContent value="existing" className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">
                    {selectedLocations.length} of {locations.length} selected
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleSelectAll('locations')}
                  >
                    {selectedLocations.length === locations.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                <ScrollArea className="h-[300px] pr-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
                    </div>
                  ) : locations.length > 0 ? (
                    <div className="space-y-2">
                      {locations.map(location => (
                        <div
                          key={location.id}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors
                            ${selectedLocations.includes(location.id)
                              ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]'
                              : 'bg-[var(--glass-bg-inset)] border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50'
                            }`}
                          onClick={() => handleSelectLocation(location.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              checked={selectedLocations.includes(location.id)}
                              onChange={() => handleSelectLocation(location.id)}
                            />
                            <MapPin className="h-4 w-4 text-[var(--brand-primary)]" />
                            <div className="flex-1">
                              <p className="font-medium text-[var(--text-primary)]">
                                {location.display_name}
                              </p>
                              <p className="text-sm text-[var(--text-secondary)]">
                                {location.location_type} • {location.state}
                              </p>
                            </div>
                            <Badge className={TIER_CONFIG[location.tier]?.color}>
                              {TIER_CONFIG[location.tier]?.label || location.tier}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MapPin className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
                      <p className="text-[var(--text-secondary)]">No locations defined yet</p>
                      <p className="text-sm text-[var(--text-tertiary)]">
                        Add locations in the "Add New" tab
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="add" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Display Name *</Label>
                    <Input
                      placeholder="e.g., Campbell County"
                      value={newLocation.display_name}
                      onChange={(e) => setNewLocation({ ...newLocation, display_name: e.target.value })}
                      className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)]"
                    />
                  </div>
                  <div>
                    <Label>Location Type</Label>
                    <select
                      value={newLocation.location_type}
                      onChange={(e) => setNewLocation({ ...newLocation, location_type: e.target.value })}
                      className="w-full h-10 px-3 rounded-md bg-[var(--glass-bg-inset)] border border-[var(--glass-border)] text-[var(--text-primary)]"
                    >
                      <option value="county">County</option>
                      <option value="city">City</option>
                      <option value="region">Region</option>
                      <option value="neighborhood">Neighborhood</option>
                    </select>
                  </div>
                  <div>
                    <Label>County</Label>
                    <Input
                      placeholder="e.g., Campbell"
                      value={newLocation.county}
                      onChange={(e) => setNewLocation({ ...newLocation, county: e.target.value })}
                      className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)]"
                    />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input
                      placeholder="e.g., Newport"
                      value={newLocation.city}
                      onChange={(e) => setNewLocation({ ...newLocation, city: e.target.value })}
                      className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)]"
                    />
                  </div>
                  <div>
                    <Label>State *</Label>
                    <Input
                      placeholder="e.g., Kentucky"
                      value={newLocation.state}
                      onChange={(e) => setNewLocation({ ...newLocation, state: e.target.value })}
                      className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)]"
                    />
                  </div>
                  <div>
                    <Label>State Abbrev</Label>
                    <Input
                      placeholder="e.g., KY"
                      maxLength={2}
                      value={newLocation.state_abbrev}
                      onChange={(e) => setNewLocation({ ...newLocation, state_abbrev: e.target.value.toUpperCase() })}
                      className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)]"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Content Tier</Label>
                    <div className="flex gap-2 mt-2">
                      {Object.entries(TIER_CONFIG).map(([key, config]) => (
                        <Button
                          key={key}
                          variant={newLocation.tier === key ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setNewLocation({ ...newLocation, tier: key })}
                          className={newLocation.tier === key ? config.color : 'border-[var(--glass-border)]'}
                        >
                          {config.label}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      {TIER_CONFIG[newLocation.tier]?.description}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleAddLocation}
                  disabled={!newLocation.display_name || !newLocation.state}
                  className="w-full bg-[var(--brand-primary)]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Step 2: Select Services */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">
                {selectedServices.length} of {services.length} selected
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleSelectAll('services')}
              >
                {selectedServices.length === services.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              {services.length > 0 ? (
                <div className="space-y-2">
                  {services.map(service => (
                    <div
                      key={service.slug}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors
                        ${selectedServices.includes(service.slug)
                          ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]'
                          : 'bg-[var(--glass-bg-inset)] border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50'
                        }`}
                      onClick={() => handleSelectService(service.slug)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedServices.includes(service.slug)}
                          onChange={() => handleSelectService(service.slug)}
                        />
                        <Scale className="h-4 w-4 text-[var(--brand-primary)]" />
                        <div className="flex-1">
                          <p className="font-medium text-[var(--text-primary)]">
                            {service.name}
                          </p>
                          {service.description && (
                            <p className="text-sm text-[var(--text-secondary)] line-clamp-1">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <FileText className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
                  <p className="text-[var(--text-secondary)]">No services defined</p>
                  <p className="text-sm text-[var(--text-tertiary)]">
                    Add services in your SEO Knowledge Base
                  </p>
                </div>
              )}
            </ScrollArea>

            {/* Summary */}
            {selectedLocations.length > 0 && selectedServices.length > 0 && (
              <div className="p-4 bg-[var(--glass-bg-inset)] rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Pages to generate:</span>
                  <span className="text-xl font-bold text-[var(--brand-primary)]">
                    {totalPages}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">
                  {selectedLocations.length} locations × {selectedServices.length} services
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Generation Progress */}
        {step === 3 && (
          <div className="space-y-6">
            {isGenerating ? (
              <div className="text-center py-8">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-[var(--glass-border)]" />
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-[var(--brand-primary)] animate-spin"
                    style={{ borderRightColor: 'transparent', borderBottomColor: 'transparent' }}
                  />
                  <SignalIcon className="absolute inset-0 m-auto h-10 w-10" style={{ color: 'var(--brand-primary)' }} />
                </div>
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                  Signal is generating your pages...
                </h3>
                <p className="text-[var(--text-secondary)]">
                  This may take a few minutes for {totalPages} pages
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[var(--brand-primary)]">
                  <CheckCircle className="h-6 w-6" />
                  <span className="text-lg font-medium">Generation Complete!</span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-[var(--glass-bg-inset)] rounded-lg text-center">
                    <p className="text-2xl font-bold text-[var(--brand-primary)]">
                      {generationResults.filter(r => r.success).length}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">Successful</p>
                  </div>
                  <div className="p-4 bg-[var(--glass-bg-inset)] rounded-lg text-center">
                    <p className="text-2xl font-bold text-[var(--accent-red)]">
                      {generationResults.filter(r => !r.success).length}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">Failed</p>
                  </div>
                  <div className="p-4 bg-[var(--glass-bg-inset)] rounded-lg text-center">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {generationResults.length > 0 
                        ? Math.round(generationResults.filter(r => r.success).reduce((sum, r) => sum + (r.uniqueness_score || 0), 0) / generationResults.filter(r => r.success).length * 100) 
                        : 0}%
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">Avg. Uniqueness</p>
                  </div>
                </div>

                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {generationResults.map((result, i) => (
                      <div 
                        key={i}
                        className={`p-3 rounded-lg flex items-center gap-3 ${
                          result.success 
                            ? 'bg-[var(--brand-primary)]/10' 
                            : 'bg-[var(--accent-red)]/10'
                        }`}
                      >
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-[var(--brand-primary)]" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-[var(--accent-red)]" />
                        )}
                        <span className="flex-1 text-sm text-[var(--text-primary)]">
                          {result.path || 'Unknown page'}
                        </span>
                        {result.uniqueness_score !== undefined && (
                          <Badge variant="outline">
                            {Math.round(result.uniqueness_score * 100)}% unique
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 1 && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => setStep(2)}
                disabled={selectedLocations.length === 0}
                className="bg-[var(--brand-primary)]"
              >
                Next: Select Services
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button 
                onClick={handleGenerate}
                disabled={selectedServices.length === 0 || isGenerating}
                className="bg-[var(--brand-primary)]"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate {totalPages} Pages
              </Button>
            </>
          )}
          {step === 3 && !isGenerating && (
            <Button 
              onClick={() => onOpenChange(false)}
              className="bg-[var(--brand-primary)]"
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
