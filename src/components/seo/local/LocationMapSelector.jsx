// src/components/seo/local/LocationMapSelector.jsx
// Interactive map for selecting counties with Census demographics overlay
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { locationPagesApi } from '@/lib/sonor-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MapPin,
  Search,
  Plus,
  Trash2,
  Users,
  DollarSign,
  GraduationCap,
  Home,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Loader2,
  Map,
  Eye,
  EyeOff,
  Layers
} from 'lucide-react'
import SignalIcon from '@/components/ui/SignalIcon'

// US States for selection
const US_STATES = [
  { abbrev: 'AL', name: 'Alabama' },
  { abbrev: 'AK', name: 'Alaska' },
  { abbrev: 'AZ', name: 'Arizona' },
  { abbrev: 'AR', name: 'Arkansas' },
  { abbrev: 'CA', name: 'California' },
  { abbrev: 'CO', name: 'Colorado' },
  { abbrev: 'CT', name: 'Connecticut' },
  { abbrev: 'DE', name: 'Delaware' },
  { abbrev: 'FL', name: 'Florida' },
  { abbrev: 'GA', name: 'Georgia' },
  { abbrev: 'HI', name: 'Hawaii' },
  { abbrev: 'ID', name: 'Idaho' },
  { abbrev: 'IL', name: 'Illinois' },
  { abbrev: 'IN', name: 'Indiana' },
  { abbrev: 'IA', name: 'Iowa' },
  { abbrev: 'KS', name: 'Kansas' },
  { abbrev: 'KY', name: 'Kentucky' },
  { abbrev: 'LA', name: 'Louisiana' },
  { abbrev: 'ME', name: 'Maine' },
  { abbrev: 'MD', name: 'Maryland' },
  { abbrev: 'MA', name: 'Massachusetts' },
  { abbrev: 'MI', name: 'Michigan' },
  { abbrev: 'MN', name: 'Minnesota' },
  { abbrev: 'MS', name: 'Mississippi' },
  { abbrev: 'MO', name: 'Missouri' },
  { abbrev: 'MT', name: 'Montana' },
  { abbrev: 'NE', name: 'Nebraska' },
  { abbrev: 'NV', name: 'Nevada' },
  { abbrev: 'NH', name: 'New Hampshire' },
  { abbrev: 'NJ', name: 'New Jersey' },
  { abbrev: 'NM', name: 'New Mexico' },
  { abbrev: 'NY', name: 'New York' },
  { abbrev: 'NC', name: 'North Carolina' },
  { abbrev: 'ND', name: 'North Dakota' },
  { abbrev: 'OH', name: 'Ohio' },
  { abbrev: 'OK', name: 'Oklahoma' },
  { abbrev: 'OR', name: 'Oregon' },
  { abbrev: 'PA', name: 'Pennsylvania' },
  { abbrev: 'RI', name: 'Rhode Island' },
  { abbrev: 'SC', name: 'South Carolina' },
  { abbrev: 'SD', name: 'South Dakota' },
  { abbrev: 'TN', name: 'Tennessee' },
  { abbrev: 'TX', name: 'Texas' },
  { abbrev: 'UT', name: 'Utah' },
  { abbrev: 'VT', name: 'Vermont' },
  { abbrev: 'VA', name: 'Virginia' },
  { abbrev: 'WA', name: 'Washington' },
  { abbrev: 'WV', name: 'West Virginia' },
  { abbrev: 'WI', name: 'Wisconsin' },
  { abbrev: 'WY', name: 'Wyoming' },
  { abbrev: 'DC', name: 'District of Columbia' },
]

// Demo mode data for when Census API is unavailable
const DEMO_COUNTIES = {
  KY: [
    { name: 'Campbell County', county_fips: '037', population: 93584, median_household_income: 62145 },
    { name: 'Kenton County', county_fips: '117', population: 167965, median_household_income: 65432 },
    { name: 'Boone County', county_fips: '015', population: 135943, median_household_income: 82100 },
    { name: 'Jefferson County', county_fips: '111', population: 782696, median_household_income: 54321 },
    { name: 'Fayette County', county_fips: '067', population: 322570, median_household_income: 58900 },
  ],
  OH: [
    { name: 'Hamilton County', county_fips: '061', population: 830639, median_household_income: 51234 },
    { name: 'Butler County', county_fips: '017', population: 387437, median_household_income: 62100 },
    { name: 'Warren County', county_fips: '165', population: 238480, median_household_income: 82543 },
    { name: 'Clermont County', county_fips: '025', population: 207453, median_household_income: 68432 },
  ],
  IN: [
    { name: 'Dearborn County', county_fips: '029', population: 49800, median_household_income: 58900 },
    { name: 'Marion County', county_fips: '097', population: 978567, median_household_income: 47800 },
  ]
}

// Metric display configs
const METRIC_CONFIG = {
  population: {
    label: 'Population',
    icon: Users,
    format: (v) => v?.toLocaleString() || 'N/A',
    color: 'var(--brand-primary)'
  },
  median_household_income: {
    label: 'Median Income',
    icon: DollarSign,
    format: (v) => v ? `$${v.toLocaleString()}` : 'N/A',
    color: 'var(--accent-blue)'
  },
  education_bachelors_plus_pct: {
    label: 'College Educated',
    icon: GraduationCap,
    format: (v) => v ? `${v.toFixed(1)}%` : 'N/A',
    color: 'var(--accent-purple)'
  },
  median_home_value: {
    label: 'Median Home Value',
    icon: Home,
    format: (v) => v ? `$${v.toLocaleString()}` : 'N/A',
    color: 'var(--accent-orange)'
  }
}

/**
 * Interactive map selector for choosing counties with Census demographics
 * 
 * Features:
 * - State selection dropdown
 * - List of counties with demographic summaries
 * - Bulk selection capabilities
 * - Demographics preview panel
 * - Adjacent county suggestions
 */
export default function LocationMapSelector({
  projectId,
  selectedCounties = [],
  onSelectionChange,
  onAddLocations,
  maxSelections = 50,
  showDemographics = true,
  allowMultiState = true
}) {
  // State
  const [activeState, setActiveState] = useState('KY')
  const [counties, setCounties] = useState([])
  const [demographics, setDemographics] = useState({}) // countyFips -> demographics
  const [isLoadingCounties, setIsLoadingCounties] = useState(false)
  const [isLoadingDemographics, setIsLoadingDemographics] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCounty, setExpandedCounty] = useState(null)
  const [showDemographicsPanel, setShowDemographicsPanel] = useState(true)
  const [adjacentCounties, setAdjacentCounties] = useState([])
  const [demoMode, setDemoMode] = useState(false)
  
  // Load counties when state changes
  useEffect(() => {
    loadCounties(activeState)
  }, [activeState])
  
  const loadCounties = async (state) => {
    setIsLoadingCounties(true)
    setCounties([])
    try {
      const data = await locationPagesApi.getCountiesInState(state)
      setCounties(data || [])
      setDemoMode(false)
    } catch (err) {
      console.error('Failed to load counties from Census API:', err)
      // Fall back to demo data
      const demoData = DEMO_COUNTIES[state] || []
      setCounties(demoData)
      setDemoMode(demoData.length > 0)
    }
    setIsLoadingCounties(false)
  }
  
  const loadDemographics = async (state, countyFips) => {
    const key = `${state}_${countyFips}`
    if (demographics[key] || isLoadingDemographics[key]) return
    
    setIsLoadingDemographics(prev => ({ ...prev, [key]: true }))
    try {
      const data = await locationPagesApi.getCountyDemographics(state, countyFips)
      setDemographics(prev => ({ ...prev, [key]: data }))
    } catch (err) {
      console.error('Failed to load demographics:', err)
      // Use county data if available
      const county = counties.find(c => c.county_fips === countyFips)
      if (county) {
        setDemographics(prev => ({ 
          ...prev, 
          [key]: {
            ...county,
            state_abbrev: state
          } 
        }))
      }
    }
    setIsLoadingDemographics(prev => ({ ...prev, [key]: false }))
  }
  
  const loadAdjacentCounties = async (state, countyFips) => {
    try {
      const data = await locationPagesApi.getAdjacentCounties(state, countyFips)
      setAdjacentCounties(data || [])
    } catch (err) {
      console.error('Failed to load adjacent counties:', err)
      setAdjacentCounties([])
    }
  }
  
  // Selection handlers
  const isSelected = useCallback((county) => {
    return selectedCounties.some(c => 
      c.county_fips === county.county_fips && c.state === activeState
    )
  }, [selectedCounties, activeState])
  
  const handleToggleCounty = useCallback((county) => {
    const exists = isSelected(county)
    
    if (exists) {
      // Remove
      const updated = selectedCounties.filter(c => 
        !(c.county_fips === county.county_fips && c.state === activeState)
      )
      onSelectionChange?.(updated)
    } else {
      // Add (if under limit)
      if (selectedCounties.length >= maxSelections) return
      
      const newSelection = {
        county_fips: county.county_fips,
        state: activeState,
        name: county.name,
        population: county.population,
        median_household_income: county.median_household_income
      }
      onSelectionChange?.([...selectedCounties, newSelection])
      
      // Load demographics for newly selected county
      loadDemographics(activeState, county.county_fips)
    }
  }, [selectedCounties, activeState, maxSelections, onSelectionChange, isSelected])
  
  const handleSelectAll = useCallback(() => {
    const filtered = filteredCounties
    const remaining = maxSelections - selectedCounties.length
    const toAdd = filtered.slice(0, remaining).map(c => ({
      county_fips: c.county_fips,
      state: activeState,
      name: c.name,
      population: c.population,
      median_household_income: c.median_household_income
    }))
    
    onSelectionChange?.([...selectedCounties, ...toAdd])
  }, [selectedCounties, maxSelections, activeState, onSelectionChange])
  
  const handleClearAll = useCallback(() => {
    if (allowMultiState) {
      // Only clear current state
      const updated = selectedCounties.filter(c => c.state !== activeState)
      onSelectionChange?.(updated)
    } else {
      onSelectionChange?.([])
    }
  }, [selectedCounties, activeState, allowMultiState, onSelectionChange])
  
  // Expand/collapse county details
  const handleExpandCounty = (county) => {
    const key = `${activeState}_${county.county_fips}`
    if (expandedCounty === key) {
      setExpandedCounty(null)
      setAdjacentCounties([])
    } else {
      setExpandedCounty(key)
      loadDemographics(activeState, county.county_fips)
      loadAdjacentCounties(activeState, county.county_fips)
    }
  }
  
  // Filter counties by search
  const filteredCounties = useMemo(() => {
    if (!searchTerm) return counties
    const term = searchTerm.toLowerCase()
    return counties.filter(c => c.name.toLowerCase().includes(term))
  }, [counties, searchTerm])
  
  // Selection stats
  const selectionStats = useMemo(() => {
    const selected = selectedCounties
    const totalPop = selected.reduce((sum, c) => sum + (c.population || 0), 0)
    const avgIncome = selected.length > 0
      ? selected.reduce((sum, c) => sum + (c.median_household_income || 0), 0) / selected.length
      : 0
    
    return {
      count: selected.length,
      totalPopulation: totalPop,
      avgIncome: avgIncome,
      stateCount: [...new Set(selected.map(c => c.state))].length
    }
  }, [selectedCounties])
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Panel: County List */}
      <div className="lg:col-span-2 space-y-4">
        {/* Controls */}
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* State Selector */}
              <div className="flex items-center gap-2">
                <Label className="text-[var(--text-secondary)]">State:</Label>
                <Select value={activeState} onValueChange={setActiveState}>
                  <SelectTrigger className="w-[180px] bg-[var(--glass-bg-inset)] border-[var(--glass-border)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map(state => (
                      <SelectItem key={state.abbrev} value={state.abbrev}>
                        {state.name} ({state.abbrev})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                  <Input
                    placeholder="Search counties..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-[var(--glass-bg-inset)] border-[var(--glass-border)]"
                  />
                </div>
              </div>
              
              {/* Bulk Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={selectedCounties.length >= maxSelections}
                  className="border-[var(--glass-border)]"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  className="border-[var(--glass-border)]"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Demo Mode Banner */}
        {demoMode && (
          <div className="p-3 bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)] rounded-lg text-sm text-[var(--accent-orange)] flex items-center gap-2">
            <SignalIcon className="h-4 w-4" />
            Demo mode: Using sample data. Connect Census API for real demographics.
          </div>
        )}
        
        {/* County List */}
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Map className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                Counties in {US_STATES.find(s => s.abbrev === activeState)?.name}
              </CardTitle>
              <Badge variant="outline">
                {filteredCounties.length} counties
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingCounties ? (
              <div className="p-8 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)] mb-4" />
                <p className="text-[var(--text-secondary)]">Loading counties...</p>
              </div>
            ) : filteredCounties.length > 0 ? (
              <ScrollArea className="h-[400px]">
                <div className="divide-y divide-[var(--glass-border)]">
                  {filteredCounties.map(county => {
                    const selected = isSelected(county)
                    const expanded = expandedCounty === `${activeState}_${county.county_fips}`
                    const demKey = `${activeState}_${county.county_fips}`
                    const countyDem = demographics[demKey]
                    
                    return (
                      <div
                        key={county.county_fips}
                        className={`transition-colors ${
                          selected 
                            ? 'bg-[var(--brand-primary)]/5' 
                            : 'hover:bg-[var(--glass-bg-hover)]'
                        }`}
                      >
                        {/* Main Row */}
                        <div 
                          className="p-4 flex items-center gap-4 cursor-pointer"
                          onClick={() => handleToggleCounty(county)}
                        >
                          <Checkbox 
                            checked={selected}
                            onCheckedChange={() => handleToggleCounty(county)}
                          />
                          
                          <div 
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
                          >
                            <MapPin className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[var(--text-primary)] truncate">
                              {county.name}
                            </p>
                            <p className="text-sm text-[var(--text-secondary)]">
                              FIPS: {county.county_fips}
                            </p>
                          </div>
                          
                          {/* Quick Stats */}
                          {showDemographics && (
                            <div className="flex items-center gap-4 text-sm">
                              {county.population && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                                        <Users className="h-3.5 w-3.5" />
                                        <span>{(county.population / 1000).toFixed(0)}k</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Population: {county.population.toLocaleString()}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {county.median_household_income && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                                        <DollarSign className="h-3.5 w-3.5" />
                                        <span>${(county.median_household_income / 1000).toFixed(0)}k</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Median Income: ${county.median_household_income.toLocaleString()}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          )}
                          
                          {/* Expand Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleExpandCounty(county)
                            }}
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                          </Button>
                        </div>
                        
                        {/* Expanded Details */}
                        {expanded && (
                          <div className="px-4 pb-4 pl-14 space-y-3">
                            {/* Demographics Grid */}
                            {countyDem ? (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.entries(METRIC_CONFIG).map(([key, config]) => {
                                  const Icon = config.icon
                                  const value = countyDem[key]
                                  return (
                                    <div 
                                      key={key}
                                      className="p-3 bg-[var(--glass-bg-inset)] rounded-lg"
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        <Icon className="h-4 w-4" style={{ color: config.color }} />
                                        <span className="text-xs text-[var(--text-tertiary)]">{config.label}</span>
                                      </div>
                                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                                        {config.format(value)}
                                      </p>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : isLoadingDemographics[demKey] ? (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[1, 2, 3, 4].map(i => (
                                  <Skeleton key={i} className="h-20" />
                                ))}
                              </div>
                            ) : null}
                            
                            {/* Adjacent Counties */}
                            {adjacentCounties.length > 0 && (
                              <div className="pt-2">
                                <p className="text-xs text-[var(--text-tertiary)] mb-2">Adjacent Counties:</p>
                                <div className="flex flex-wrap gap-2">
                                  {adjacentCounties.slice(0, 8).map(adj => (
                                    <Badge 
                                      key={`${adj.state}_${adj.county_fips}`}
                                      variant="outline"
                                      className="cursor-pointer hover:bg-[var(--brand-primary)]/10"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (adj.state !== activeState && allowMultiState) {
                                          // Would switch states and add
                                        }
                                        const adjCounty = {
                                          county_fips: adj.county_fips,
                                          state: adj.state,
                                          name: adj.name,
                                          population: adj.population
                                        }
                                        handleToggleCounty(adjCounty)
                                      }}
                                    >
                                      {adj.name}
                                      {adj.state !== activeState && ` (${adj.state})`}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="p-8 text-center">
                <MapPin className="h-12 w-12 text-[var(--text-tertiary)] mx-auto mb-4" />
                <p className="text-[var(--text-secondary)]">
                  {searchTerm ? 'No counties match your search' : 'No counties found'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Right Panel: Selection Summary */}
      <div className="space-y-4">
        {/* Selection Stats */}
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
              Selection Summary
            </CardTitle>
            <CardDescription>
              {selectionStats.count} of {maxSelections} max
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[var(--glass-bg-inset)] rounded-lg text-center">
                <Users className="h-5 w-5 mx-auto mb-1" style={{ color: 'var(--brand-primary)' }} />
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  {selectionStats.totalPopulation > 1000000
                    ? `${(selectionStats.totalPopulation / 1000000).toFixed(1)}M`
                    : `${(selectionStats.totalPopulation / 1000).toFixed(0)}k`
                  }
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">Total Population</p>
              </div>
              <div className="p-3 bg-[var(--glass-bg-inset)] rounded-lg text-center">
                <DollarSign className="h-5 w-5 mx-auto mb-1" style={{ color: 'var(--accent-blue)' }} />
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  ${(selectionStats.avgIncome / 1000).toFixed(0)}k
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">Avg. Income</p>
              </div>
            </div>
            
            {/* States Badge */}
            {allowMultiState && selectionStats.stateCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Map className="h-4 w-4" />
                Across {selectionStats.stateCount} state{selectionStats.stateCount > 1 ? 's' : ''}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Selected Counties List */}
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Selected Counties</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {selectedCounties.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <div className="divide-y divide-[var(--glass-border)]">
                  {selectedCounties.map(county => (
                    <div 
                      key={`${county.state}_${county.county_fips}`}
                      className="p-3 flex items-center gap-3 hover:bg-[var(--glass-bg-hover)]"
                    >
                      <MapPin className="h-4 w-4 text-[var(--brand-primary)]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {county.name}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {county.state} • {county.population?.toLocaleString() || 'N/A'} pop.
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          const updated = selectedCounties.filter(c =>
                            !(c.county_fips === county.county_fips && c.state === county.state)
                          )
                          onSelectionChange?.(updated)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="p-6 text-center text-[var(--text-tertiary)]">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No counties selected</p>
                <p className="text-xs">Click counties to add them</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Add to Locations Button */}
        {onAddLocations && selectedCounties.length > 0 && (
          <Button
            onClick={() => onAddLocations(selectedCounties)}
            className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {selectedCounties.length} Location{selectedCounties.length > 1 ? 's' : ''}
          </Button>
        )}
      </div>
    </div>
  )
}
