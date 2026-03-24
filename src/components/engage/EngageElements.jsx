// src/components/engage/EngageElements.jsx
// List and manage engage elements (popups, nudges, banners)

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/lib/toast'
import { engageApi } from '@/lib/sonor-api'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Pause,
  Play,
  Eye,
  BarChart2,
  Loader2,
  Search,
  Sparkles,
  MessageSquare,
  Bell,
  AlertTriangle,
  Megaphone,
  Zap
} from 'lucide-react'

// Element type configs
const ELEMENT_TYPES = {
  popup: { label: 'Popup', icon: MessageSquare, color: 'bg-blue-100 text-blue-800' },
  nudge: { label: 'Nudge', icon: Sparkles, color: 'bg-purple-100 text-purple-800' },
  banner: { label: 'Banner', icon: Megaphone, color: 'bg-orange-100 text-orange-800' },
  toast: { label: 'Toast', icon: Bell, color: 'bg-green-100 text-green-800' }
}

export default function EngageElements({ projectId, onEditElement }) {
  const [elements, setElements] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ type: 'all', status: 'all', search: '' })

  useEffect(() => {
    if (projectId) {
      fetchElements()
    }
  }, [projectId])

  const fetchElements = async () => {
    try {
      setLoading(true)
      const params = { projectId }
      if (filter.type !== 'all') params.type = filter.type
      if (filter.status !== 'all') params.status = filter.status

      const { data } = await engageApi.getElements(params)
      setElements(data.elements || [])
    } catch (error) {
      console.error('Failed to fetch elements:', error)
      toast.error('Failed to load elements')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (elementId, action) => {
    try {
      if (action === 'delete') {
        if (!confirm('Are you sure you want to delete this element?')) return
        await engageApi.deleteElement(elementId)
        toast.success('Element deleted')
      } else {
        await engageApi.updateElement(elementId, { action })
        toast.success(`Element ${action}ed`)
      }
      fetchElements()
    } catch (error) {
      console.error(`Failed to ${action} element:`, error)
      toast.error(`Failed to ${action} element`)
    }
  }

  const handleCreate = async (type) => {
    try {
      const { data } = await engageApi.createElement({
        projectId,
        name: `New ${ELEMENT_TYPES[type]?.label || 'Element'}`,
        element_type: type,
        headline: 'Your headline here',
        body: 'Your message here',
        cta_text: 'Learn More',
        trigger_type: 'time',
        trigger_config: { delay_seconds: 5 }
      })
      toast.success('Element created')
      onEditElement?.(data.element.id)
    } catch (error) {
      console.error('Failed to create element:', error)
      toast.error('Failed to create element')
    }
  }

  const filteredElements = elements.filter(el => {
    if (filter.search) {
      const search = filter.search.toLowerCase()
      if (!el.name.toLowerCase().includes(search) && 
          !el.headline?.toLowerCase().includes(search)) {
        return false
      }
    }
    return true
  })

  const getStatusBadge = (el) => {
    if (el.is_draft) {
      return <Badge variant="secondary">Draft</Badge>
    }
    if (el.is_active) {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>
    }
    return <Badge variant="outline">Paused</Badge>
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num?.toString() || '0'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search elements..."
              value={filter.search}
              onChange={(e) => setFilter(f => ({ ...f, search: e.target.value }))}
              className="pl-9 w-64"
            />
          </div>
          
          <Select 
            value={filter.type} 
            onValueChange={(v) => {
              setFilter(f => ({ ...f, type: v }))
              setTimeout(fetchElements, 0)
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="popup">Popups</SelectItem>
              <SelectItem value="nudge">Nudges</SelectItem>
              <SelectItem value="banner">Banners</SelectItem>
              <SelectItem value="toast">Toasts</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={filter.status} 
            onValueChange={(v) => {
              setFilter(f => ({ ...f, status: v }))
              setTimeout(fetchElements, 0)
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Element
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleCreate('popup')}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Popup
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreate('nudge')}>
              <Sparkles className="w-4 h-4 mr-2" />
              Nudge
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreate('banner')}>
              <Megaphone className="w-4 h-4 mr-2" />
              Banner
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreate('toast')}>
              <Bell className="w-4 h-4 mr-2" />
              Toast
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Elements Table */}
      {filteredElements.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No elements yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first popup, nudge, or banner to start engaging visitors.
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Element
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleCreate('popup')}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Popup
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreate('nudge')}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Nudge
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreate('banner')}>
                  <Megaphone className="w-4 h-4 mr-2" />
                  Banner
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Element</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Conv.</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredElements.map(el => {
                const typeConfig = ELEMENT_TYPES[el.element_type] || ELEMENT_TYPES.popup
                const TypeIcon = typeConfig.icon
                const ctr = el.total_impressions > 0 
                  ? ((el.total_clicks / el.total_impressions) * 100).toFixed(1) 
                  : '0'
                
                return (
                  <TableRow 
                    key={el.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onEditElement?.(el)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{el.name}</span>
                        {el.headline && (
                          <span className="text-sm text-muted-foreground truncate max-w-xs">
                            {el.headline}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={typeConfig.color}>
                        <TypeIcon className="w-3 h-3 mr-1" />
                        {typeConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(el)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatNumber(el.total_impressions)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatNumber(el.total_clicks)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {ctr}%
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatNumber(el.total_conversions)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEditElement?.(el)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <BarChart2 className="w-4 h-4 mr-2" />
                            Analytics
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {el.is_active ? (
                            <DropdownMenuItem onClick={() => handleAction(el.id, 'pause')}>
                              <Pause className="w-4 h-4 mr-2" />
                              Pause
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleAction(el.id, el.is_draft ? 'publish' : 'resume')}>
                              <Play className="w-4 h-4 mr-2" />
                              {el.is_draft ? 'Publish' : 'Resume'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleAction(el.id, 'duplicate')}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleAction(el.id, 'delete')}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
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
