// ═══════════════════════════════════════════════════════════════════════════════
// OfferingSelector - Select a commerce offering for email campaigns
// ═══════════════════════════════════════════════════════════════════════════════
// Used in CampaignComposer to attach a product/service/event to an email campaign
// Auto-populates template variables with offering data

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Package,
  Wrench,
  GraduationCap,
  Calendar,
  Search,
  X,
  Check,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import portalApi from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'

// Type configuration
const typeConfig = {
  product: { icon: Package, label: 'Product', color: 'bg-blue-100 text-blue-700' },
  service: { icon: Wrench, label: 'Service', color: 'bg-green-100 text-green-700' },
  class: { icon: GraduationCap, label: 'Class', color: 'bg-purple-100 text-purple-700' },
  event: { icon: Calendar, label: 'Event', color: 'bg-orange-100 text-orange-700' },
}

// Template type recommendations based on offering type
const templateRecommendations = {
  product: 'product-announcement',
  service: 'service-promotion',
  class: 'event-invitation',
  event: 'event-invitation',
}

/**
 * OfferingSelector Component
 * 
 * @param {Object} props
 * @param {Object|null} props.selectedOffering - Currently selected offering
 * @param {Function} props.onSelect - Callback when offering is selected (offering, templateVariables)
 * @param {Function} props.onClear - Callback to clear selection
 * @param {string} props.recommendedTemplateType - Optional template type to recommend
 */
export default function OfferingSelector({ 
  selectedOffering, 
  onSelect, 
  onClear,
  onTemplateRecommendation 
}) {
  const { currentProject } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [offerings, setOfferings] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  // Fetch offerings when dialog opens
  useEffect(() => {
    if (isOpen && currentProject?.id) {
      fetchOfferings()
    }
  }, [isOpen, currentProject?.id])

  const fetchOfferings = async () => {
    if (!currentProject?.id) return
    
    setLoading(true)
    try {
      const response = await portalApi.get(`/commerce/offerings/${currentProject.id}`, {
        params: { status: 'active', limit: 100 }
      })
      setOfferings(response.data?.data || response.data || [])
    } catch (err) {
      console.error('Failed to fetch offerings:', err)
      setOfferings([])
    } finally {
      setLoading(false)
    }
  }

  // Build template variables from offering
  const buildTemplateVariables = (offering) => {
    const vars = {
      product_name: offering.name,
      product_description: offering.short_description || offering.description || '',
      product_price: offering.price ? `$${offering.price.toLocaleString()}` : 'Contact for pricing',
      product_image: offering.featured_image || '',
      product_url: offering.page_path || '',
    }

    // Add event-specific variables
    if (offering.type === 'event' || offering.type === 'class') {
      // If there's a next schedule, use it
      const nextSchedule = offering.schedules?.[0]
      if (nextSchedule) {
        vars.event_date = new Date(nextSchedule.start_date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
        vars.event_time = nextSchedule.start_time || 'TBD'
        vars.event_location = nextSchedule.location || offering.location || 'TBD'
      } else {
        vars.event_date = 'Date TBD'
        vars.event_time = 'Time TBD'
        vars.event_location = offering.location || 'Location TBD'
      }
    }

    return vars
  }

  const handleSelect = (offering) => {
    const templateVars = buildTemplateVariables(offering)
    onSelect(offering, templateVars)
    
    // Recommend a template type based on offering type
    if (onTemplateRecommendation && templateRecommendations[offering.type]) {
      onTemplateRecommendation(templateRecommendations[offering.type])
    }
    
    setIsOpen(false)
    setSearch('')
    setTypeFilter('all')
  }

  // Filter offerings based on search and type
  const filteredOfferings = offerings.filter(o => {
    const matchesSearch = !search || 
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.short_description?.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || o.type === typeFilter
    return matchesSearch && matchesType
  })

  // Render selected offering badge
  if (selectedOffering) {
    const config = typeConfig[selectedOffering.type] || typeConfig.product
    const Icon = config.icon
    
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
        {selectedOffering.featured_image ? (
          <img
            src={selectedOffering.featured_image}
            alt={selectedOffering.name}
            className="h-12 w-12 rounded-md object-cover"
          />
        ) : (
          <div className={`p-2 rounded-md ${config.color}`}>
            <Icon className="h-6 w-6" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{selectedOffering.name}</span>
            <Badge variant="outline" className={`text-xs ${config.color}`}>
              {config.label}
            </Badge>
          </div>
          {selectedOffering.price && (
            <p className="text-sm text-muted-foreground">
              ${selectedOffering.price.toLocaleString()}
            </p>
          )}
        </div>
        
        <Button variant="ghost" size="icon" onClick={onClear}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <>
      <Button 
        variant="outline" 
        className="w-full justify-start text-muted-foreground"
        onClick={() => setIsOpen(true)}
      >
        <Package className="h-4 w-4 mr-2" />
        Attach Product, Service, or Event...
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select an Offering</DialogTitle>
            <DialogDescription>
              Choose a product, service, or event to promote. Template variables will be automatically filled.
            </DialogDescription>
          </DialogHeader>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search offerings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="product">Products</SelectItem>
                <SelectItem value="service">Services</SelectItem>
                <SelectItem value="class">Classes</SelectItem>
                <SelectItem value="event">Events</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Offerings List */}
          <ScrollArea className="h-[400px] -mx-6 px-6">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredOfferings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {offerings.length === 0 ? (
                  <>
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No active offerings found</p>
                    <p className="text-sm">Create offerings in the Commerce module first</p>
                  </>
                ) : (
                  <>
                    <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No offerings match your search</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredOfferings.map((offering) => {
                  const config = typeConfig[offering.type] || typeConfig.product
                  const Icon = config.icon
                  
                  return (
                    <button
                      key={offering.id}
                      onClick={() => handleSelect(offering)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                    >
                      {offering.featured_image ? (
                        <img
                          src={offering.featured_image}
                          alt={offering.name}
                          className="h-14 w-14 rounded-md object-cover"
                        />
                      ) : (
                        <div className={`p-3 rounded-md ${config.color}`}>
                          <Icon className="h-7 w-7" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{offering.name}</span>
                          <Badge variant="outline" className={`text-xs ${config.color}`}>
                            {config.label}
                          </Badge>
                        </div>
                        {offering.short_description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {offering.short_description}
                          </p>
                        )}
                        <p className="text-sm font-medium text-muted-foreground">
                          {offering.price ? `$${offering.price.toLocaleString()}` : 'Quote'}
                        </p>
                      </div>

                      <Check className="h-5 w-5 text-muted-foreground/30" />
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Compact version for inline use
 */
export function OfferingSelectorCompact({ selectedOffering, onSelect, onClear }) {
  return (
    <OfferingSelector 
      selectedOffering={selectedOffering}
      onSelect={onSelect}
      onClear={onClear}
    />
  )
}
