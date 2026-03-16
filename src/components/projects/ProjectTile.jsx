/**
 * ProjectTile - Visual project card with website screenshot preview
 * 
 * Features:
 * - Website screenshot using our own Portal API screenshot service
 * - Brand color accent
 * - Status indicator
 * - Module badges
 */
import { useState, useEffect, memo } from 'react'
import { 
  Globe, ExternalLink, Settings, Star, Loader2,
  FolderKanban, Check, AlertCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// Screenshot service URL - using our own Portal API screenshot service
// Captures screenshots via Puppeteer and caches them in Supabase Storage
const getScreenshotApiUrl = (domain, width = 1280, height = 800) => {
  if (!domain) return null
  
  // Clean the domain
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  
  // Use Portal API screenshot endpoint
  const apiUrl = import.meta.env.VITE_PORTAL_API_URL || 'https://api.sonor.io'
  return `${apiUrl}/screenshots?domain=${encodeURIComponent(cleanDomain)}&width=${width}&height=${height}`
}

// Custom hook to fetch screenshot URL from our API
const useScreenshotUrl = (domain) => {
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!domain) {
      setUrl(null)
      return
    }

    const apiUrl = getScreenshotApiUrl(domain)
    if (!apiUrl) return

    setLoading(true)
    setError(false)

    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.url) {
          setUrl(data.url)
        } else {
          setError(true)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [domain])

  return { url, loading, error }
}

// Project status colors
const STATUS_COLORS = {
  planning: 'bg-slate-500',
  discovery: 'bg-purple-500',
  design: 'bg-blue-500',
  development: 'bg-amber-500',
  review: 'bg-orange-500',
  launch: 'bg-cyan-500',
  completed: 'bg-emerald-500',
  on_hold: 'bg-gray-400',
  active: 'bg-emerald-500',
}

const STATUS_LABELS = {
  planning: 'Planning',
  discovery: 'Discovery',
  design: 'Design',
  development: 'Development',
  review: 'Review',
  launch: 'Launch',
  completed: 'Completed',
  on_hold: 'On Hold',
  active: 'Active',
}

const ProjectTile = memo(function ProjectTile({
  project,
  isActive = false,
  isFavorite = false,
  onSelect,
  onToggleFavorite,
  onOpenSettings,
  showOrgName = false,
  orgName,
}) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  // Use our custom hook to fetch screenshot URL from the API
  const { url: screenshotUrl, loading: screenshotLoading, error: screenshotError } = useScreenshotUrl(project.domain)
  
  // Reset image states when screenshot URL changes
  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
  }, [screenshotUrl])
  
  const statusColor = STATUS_COLORS[project.status] || STATUS_COLORS.active
  const statusLabel = STATUS_LABELS[project.status] || 'Active'
  
  // Get brand colors for gradient accent
  const brandPrimary = project.brand_primary || project.theme_color || '#4bbf39'

  // Show fallback if no URL, API error, or image load error
  const showFallback = !screenshotUrl || screenshotError || imageError

  return (
    <div
      onClick={() => onSelect?.(project)}
      className={cn(
        "group relative bg-card border rounded-lg overflow-hidden cursor-pointer transition-all",
        "hover:border-primary/50 hover:shadow-lg hover:scale-[1.02]",
        isActive && "ring-2 ring-primary border-primary shadow-lg"
      )}
    >
      {/* Screenshot Preview - Taller aspect ratio for better website previews */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {!showFallback ? (
          <>
            {(!imageLoaded || screenshotLoading) && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <img
              src={screenshotUrl}
              alt={`${project.title} preview`}
              className={cn(
                "w-full h-full object-cover object-top transition-opacity",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          </>
        ) : (
          // Fallback when no domain or image error
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ 
              background: `linear-gradient(135deg, ${brandPrimary}20 0%, ${brandPrimary}10 100%)` 
            }}
          >
            {project.logo_url ? (
              <img
                src={project.logo_url}
                alt={`${project.title} logo`}
                className="w-16 h-16 object-contain"
              />
            ) : (
              <FolderKanban 
                className="h-12 w-12" 
                style={{ color: brandPrimary }}
              />
            )}
            {!project.domain && (
              <span className="mt-2 text-xs text-muted-foreground">
                No website configured
              </span>
            )}
          </div>
        )}
        
        {/* Top-left: Status badge */}
        <div className="absolute top-2 left-2">
          <Badge 
            variant="secondary" 
            className={cn(
              "text-[10px] font-medium shadow-sm",
              statusColor.replace('bg-', 'bg-') + "/90",
              "text-white border-0"
            )}
            style={{ backgroundColor: `var(--${statusColor.replace('bg-', '')}, ${statusColor})` }}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full mr-1", statusColor)} />
            {statusLabel}
          </Badge>
        </div>
        
        {/* Top-right: Actions */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleFavorite?.(project.id)
                  }}
                >
                  <Star 
                    className={cn(
                      "h-3.5 w-3.5",
                      isFavorite && "fill-yellow-400 text-yellow-400"
                    )} 
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {project.domain && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      const url = project.domain.startsWith('http') 
                        ? project.domain 
                        : `https://${project.domain}`
                      window.open(url, '_blank')
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Visit website</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenSettings?.(project)
                  }}
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Project settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Selected indicator */}
        {isActive && (
          <div className="absolute bottom-2 right-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-lg">
              <Check className="h-3.5 w-3.5" />
            </div>
          </div>
        )}

        {/* Brand color gradient accent bar */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ background: `linear-gradient(90deg, ${brandPrimary} 0%, ${brandPrimary} 100%)` }}
        />
      </div>
      
      {/* Project Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className={cn(
              "font-medium truncate",
              isActive && "text-primary"
            )}>
              {project.title}
            </h3>
            {showOrgName && orgName && (
              <p className="text-xs text-muted-foreground truncate">
                {orgName}
              </p>
            )}
          </div>
          
          {isFavorite && (
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0" />
          )}
        </div>
        
        {/* Domain */}
        {project.domain && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe className="h-3 w-3" />
            <span className="truncate">{project.domain}</span>
          </div>
        )}
        
        {/* Module badges */}
        {project.features && project.features.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.features.slice(0, 3).map((feature) => (
              <Badge 
                key={feature} 
                variant="outline" 
                className="text-[10px] h-5 px-1.5"
              >
                {feature}
              </Badge>
            ))}
            {project.features.length > 3 && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                +{project.features.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

export default ProjectTile

// Simple list version for sidebar
export function ProjectListItem({
  project,
  isActive = false,
  isFavorite = false,
  onSelect,
  onToggleFavorite,
  showOrgName = false,
  orgName,
}) {
  const brandPrimary = project.brand_primary || project.theme_color || '#4bbf39'

  return (
    <button
      onClick={() => onSelect?.(project)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors rounded-md",
        isActive 
          ? "bg-primary/10 text-primary" 
          : "hover:bg-muted text-foreground"
      )}
    >
      {/* Color gradient dot */}
      <div 
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ background: `linear-gradient(135deg, ${brandPrimary} 0%, ${brandPrimary} 100%)` }}
      />
      
      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-medium truncate",
            isActive && "text-primary"
          )}>
            {project.title}
          </span>
          {isFavorite && (
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />
          )}
        </div>
        {showOrgName && orgName && (
          <p className="text-xs text-muted-foreground truncate">
            {orgName}
          </p>
        )}
      </div>
      
      {isActive && (
        <Check className="h-4 w-4 text-primary shrink-0" />
      )}
    </button>
  )
}
