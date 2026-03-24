// src/components/engage/dashboard/EngageElementsGrid.jsx
// Grid/List view for engage elements

import { useState } from 'react'
import { useBrandColors } from '@/hooks/useBrandColors'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plus,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Play,
  Pause,
  Eye,
  BarChart3,
  MessageSquare,
  Megaphone,
  Sparkles,
  Bell,
  PanelBottom,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { engageApi } from '@/lib/sonor-api'
import { toast } from '@/lib/toast'

// Element type configurations
const ELEMENT_TYPES = {
  popup: { label: 'Popup', icon: MessageSquare, color: 'blue' },
  banner: { label: 'Banner', icon: Megaphone, color: 'orange' },
  nudge: { label: 'Nudge', icon: Sparkles, color: 'purple' },
  toast: { label: 'Toast', icon: Bell, color: 'green' },
  'slide-in': { label: 'Slide-in', icon: PanelBottom, color: 'teal' }
}

const COLOR_CLASSES = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
}

export default function EngageElementsGrid({
  elements = [],
  isLoading,
  viewMode = 'grid',
  onEdit,
  onCreate,
  onRefresh,
  elementType = null
}) {
  const brandColors = useBrandColors()
  const [actionLoading, setActionLoading] = useState(null)
  
  const typeLabel = elementType 
    ? ELEMENT_TYPES[elementType]?.label || 'Elements'
    : 'All Elements'

  const handleAction = async (element, action) => {
    setActionLoading(element.id)
    try {
      switch (action) {
        case 'publish':
          await engageApi.updateElement(element.id, { is_active: true, is_draft: false })
          toast.success('Element published')
          break
        case 'pause':
          await engageApi.updateElement(element.id, { is_active: false })
          toast.success('Element paused')
          break
        case 'duplicate':
          await engageApi.duplicateElement(element.id)
          toast.success('Element duplicated')
          break
        case 'delete':
          if (!confirm('Are you sure you want to delete this element?')) {
            setActionLoading(null)
            return
          }
          await engageApi.deleteElement(element.id)
          toast.success('Element deleted')
          break
      }
      onRefresh?.()
    } catch (error) {
      console.error(`Failed to ${action} element:`, error)
      toast.error(`Failed to ${action} element`)
    } finally {
      setActionLoading(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : (
          <Skeleton className="h-64" />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{typeLabel}</h2>
          <p className="text-sm text-muted-foreground">
            {elements.length} {elements.length === 1 ? 'element' : 'elements'}
          </p>
        </div>
        <Button onClick={onCreate} style={{ backgroundColor: brandColors.primary, color: 'white' }}>
          <Plus className="h-4 w-4 mr-2" />
          New {elementType ? ELEMENT_TYPES[elementType]?.label : 'Element'}
        </Button>
      </div>

      {/* Empty State */}
      {elements.length === 0 ? (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-16 text-center">
            <Layers className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-2">No {typeLabel.toLowerCase()} yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first {elementType || 'element'} to start engaging visitors
            </p>
            <Button onClick={onCreate} style={{ backgroundColor: brandColors.primary, color: 'white' }}>
              <Plus className="h-4 w-4 mr-2" />
              Create {elementType ? ELEMENT_TYPES[elementType]?.label : 'Element'}
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {elements.map((element) => {
            const typeConfig = ELEMENT_TYPES[element.element_type] || ELEMENT_TYPES.popup
            const Icon = typeConfig.icon
            
            return (
              <Card 
                key={element.id} 
                className="bg-[var(--glass-bg)] border-[var(--glass-border)] hover:border-[var(--brand-primary)] transition-colors cursor-pointer group"
                onClick={() => onEdit(element)}
              >
                <CardContent className="p-4">
                  {/* Preview */}
                  <div className="aspect-video bg-[var(--surface-tertiary)] rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    <div 
                      className="w-3/4 p-4 rounded-lg shadow-lg text-center transform group-hover:scale-105 transition-transform"
                      style={{
                        backgroundColor: element.appearance?.backgroundColor || '#ffffff',
                        color: element.appearance?.textColor || '#1a1a1a'
                      }}
                    >
                      <p className="text-xs font-semibold truncate">
                        {element.headline || 'Your headline'}
                      </p>
                      <p className="text-[10px] opacity-70 truncate mt-0.5">
                        {element.body?.substring(0, 30) || 'Your message'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn("p-1 rounded", COLOR_CLASSES[typeConfig.color])}>
                          <Icon className="h-3 w-3" />
                        </div>
                        <p className="font-medium text-sm truncate">{element.name || 'Untitled'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={element.is_active ? 'default' : 'secondary'} 
                          className="text-xs"
                        >
                          {element.is_active ? 'Active' : element.is_draft ? 'Draft' : 'Paused'}
                        </Badge>
                        {element.impressions > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {element.impressions}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(element) }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(element, 'duplicate') }}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {element.is_active ? (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(element, 'pause') }}>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(element, 'publish') }}>
                            <Play className="h-4 w-4 mr-2" />
                            Publish
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); handleAction(element, 'delete') }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        /* List View */
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Impressions</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {elements.map((element) => {
                const typeConfig = ELEMENT_TYPES[element.element_type] || ELEMENT_TYPES.popup
                const Icon = typeConfig.icon
                
                return (
                  <TableRow 
                    key={element.id} 
                    className="cursor-pointer hover:bg-[var(--surface-tertiary)]"
                    onClick={() => onEdit(element)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded", COLOR_CLASSES[typeConfig.color])}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{element.name || 'Untitled'}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {element.headline}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{typeConfig.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={element.is_active ? 'default' : 'secondary'}>
                        {element.is_active ? 'Active' : element.is_draft ? 'Draft' : 'Paused'}
                      </Badge>
                    </TableCell>
                    <TableCell>{element.impressions || 0}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {element.updated_at 
                        ? format(new Date(element.updated_at), 'MMM d, yyyy')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(element) }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(element, 'duplicate') }}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {element.is_active ? (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(element, 'pause') }}>
                              <Pause className="h-4 w-4 mr-2" />
                              Pause
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(element, 'publish') }}>
                              <Play className="h-4 w-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); handleAction(element, 'delete') }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
