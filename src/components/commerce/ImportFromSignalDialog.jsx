// Import from Signal Dialog
// Shows discovered pages from Signal setup wizard and allows importing as offerings

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { commerceApi } from '@/lib/sonor-api'
import { cn } from '@/lib/utils'
import { 
  Package, 
  Briefcase, 
  Calendar, 
  GraduationCap,
  Sparkles,
  ExternalLink,
  X,
  Check,
  AlertCircle,
  Download,
  Loader2
} from 'lucide-react'

const TYPE_CONFIG = {
  service: {
    icon: Briefcase,
    label: 'Service',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  product: {
    icon: Package,
    label: 'Product',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  class: {
    icon: GraduationCap,
    label: 'Class',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  event: {
    icon: Calendar,
    label: 'Event',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
}

function DiscoveryCard({ discovery, selected, onToggle, onDismiss }) {
  const typeConfig = TYPE_CONFIG[discovery.classification] || TYPE_CONFIG.service
  const Icon = typeConfig.icon
  
  return (
    <div 
      className={cn(
        'p-4 rounded-xl border transition-all cursor-pointer',
        'bg-[var(--glass-bg)] border-[var(--glass-border)]',
        'hover:border-[var(--brand-primary)]/40',
        selected && 'ring-2 ring-[var(--brand-primary)] border-transparent'
      )}
      onClick={() => onToggle(discovery.id)}
    >
      <div className="flex items-start gap-3">
        <Checkbox 
          checked={selected}
          className="mt-1"
          onClick={(e) => e.stopPropagation()}
          onCheckedChange={() => onToggle(discovery.id)}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={cn('p-1.5 rounded-lg', typeConfig.bgColor)}>
              <Icon className={cn('h-4 w-4', typeConfig.color)} />
            </div>
            <span className="font-medium text-[var(--text-primary)] truncate">
              {discovery.suggested_name || discovery.page_title || 'Untitled'}
            </span>
            <Badge variant="outline" className="text-xs ml-auto shrink-0">
              {Math.round((discovery.confidence || 0.5) * 100)}%
            </Badge>
          </div>
          
          <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-2">
            {discovery.description || discovery.suggested_description || 'No description available'}
          </p>
          
          <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
            <span className="truncate">{discovery.page_path}</span>
            {discovery.page_url && (
              <a 
                href={discovery.page_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-[var(--brand-primary)] shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            {discovery.has_pricing_indicators && (
              <Badge variant="secondary" className="text-xs">💰 Pricing detected</Badge>
            )}
            {discovery.has_booking_indicators && (
              <Badge variant="secondary" className="text-xs">📅 Booking detected</Badge>
            )}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-[var(--text-tertiary)] hover:text-red-500"
          onClick={(e) => {
            e.stopPropagation()
            onDismiss(discovery.id)
          }}
          title="Dismiss this discovery"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function ImportFromSignalDialog({ 
  projectId, 
  open, 
  onOpenChange,
  onImportComplete 
}) {
  const [discoveries, setDiscoveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [error, setError] = useState(null)
  const [importResult, setImportResult] = useState(null)
  
  // Fetch discoveries on open
  useEffect(() => {
    if (open && projectId) {
      fetchDiscoveries()
    }
  }, [open, projectId])
  
  const fetchDiscoveries = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await commerceApi.getDiscoveries(projectId, { status: 'pending' })
      setDiscoveries(response.data || [])
      // Select all by default
      setSelectedIds(new Set((response.data || []).map(d => d.id)))
    } catch (err) {
      console.error('Failed to fetch discoveries:', err)
      setError('Failed to load discoveries')
    } finally {
      setLoading(false)
    }
  }
  
  const toggleSelection = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }
  
  const selectAll = () => {
    setSelectedIds(new Set(discoveries.map(d => d.id)))
  }
  
  const selectNone = () => {
    setSelectedIds(new Set())
  }
  
  const handleDismiss = async (id) => {
    try {
      await commerceApi.updateDiscoveryStatus(id, 'dismissed')
      setDiscoveries(prev => prev.filter(d => d.id !== id))
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (err) {
      console.error('Failed to dismiss discovery:', err)
    }
  }
  
  const handleImport = async () => {
    if (selectedIds.size === 0) return
    
    setImporting(true)
    setError(null)
    setImportResult(null)
    
    try {
      const response = await commerceApi.bulkImportDiscoveries(projectId, Array.from(selectedIds))
      const result = response.data
      
      setImportResult(result)
      
      // Remove imported discoveries from the list
      if (result.imported > 0) {
        setDiscoveries(prev => prev.filter(d => !selectedIds.has(d.id) || result.errors?.some(e => e.includes(d.id))))
        setSelectedIds(new Set())
        
        // Notify parent
        if (onImportComplete) {
          onImportComplete(result)
        }
      }
    } catch (err) {
      console.error('Failed to import discoveries:', err)
      setError('Failed to import selected pages')
    } finally {
      setImporting(false)
    }
  }
  
  // Group discoveries by type
  const groupedDiscoveries = discoveries.reduce((acc, d) => {
    const type = d.classification || 'unknown'
    if (!acc[type]) acc[type] = []
    acc[type].push(d)
    return acc
  }, {})
  
  const hasDiscoveries = discoveries.length > 0
  const selectedCount = selectedIds.size
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--brand-primary)]" />
            Import from Signal
          </DialogTitle>
          <DialogDescription>
            Signal discovered these pages during setup that may be services, products, or events. 
            Select the ones you'd like to import as draft offerings.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-[var(--text-secondary)]">{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchDiscoveries}>
                Try Again
              </Button>
            </div>
          ) : !hasDiscoveries ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Check className="h-12 w-12 text-emerald-500 mb-4" />
              <p className="text-lg font-medium text-[var(--text-primary)]">All caught up!</p>
              <p className="text-[var(--text-secondary)] mt-1">
                No pending discoveries to import
              </p>
            </div>
          ) : (
            <>
              {/* Selection controls */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--glass-border)]">
                <span className="text-sm text-[var(--text-secondary)]">
                  {selectedCount} of {discoveries.length} selected
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={selectNone}>
                    Select None
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-6">
                  {Object.entries(groupedDiscoveries).map(([type, items]) => {
                    const config = TYPE_CONFIG[type] || TYPE_CONFIG.service
                    const Icon = config.icon
                    
                    return (
                      <div key={type}>
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className={cn('h-4 w-4', config.color)} />
                          <span className="font-medium text-sm text-[var(--text-primary)]">
                            {config.label}s
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {items.length}
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          {items.map(discovery => (
                            <DiscoveryCard
                              key={discovery.id}
                              discovery={discovery}
                              selected={selectedIds.has(discovery.id)}
                              onToggle={toggleSelection}
                              onDismiss={handleDismiss}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
        
        {/* Import result */}
        {importResult && (
          <div className={cn(
            'p-3 rounded-lg text-sm',
            importResult.errors?.length > 0 
              ? 'bg-amber-500/10 text-amber-600' 
              : 'bg-emerald-500/10 text-emerald-600'
          )}>
            {importResult.imported > 0 && (
              <p className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Imported {importResult.imported} offering{importResult.imported !== 1 ? 's' : ''} as drafts
              </p>
            )}
            {importResult.errors?.length > 0 && (
              <p className="mt-1">
                {importResult.errors.length} failed: {importResult.errors[0]}
              </p>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {hasDiscoveries ? 'Close' : 'Done'}
          </Button>
          {hasDiscoveries && (
            <Button
              onClick={handleImport}
              disabled={selectedCount === 0 || importing}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Import {selectedCount} as Draft{selectedCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
