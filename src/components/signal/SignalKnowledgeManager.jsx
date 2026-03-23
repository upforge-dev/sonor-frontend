// src/components/signal/SignalKnowledgeManager.jsx
// Knowledge base management UI - list, add, edit, delete with type filtering
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  FileText,
  HelpCircle,
  DollarSign,
  Shield,
  Star,
  Users,
  Briefcase,
  Workflow,
  MapPin,
  Tag,
  ChevronDown,
  Loader2,
  Check,
  X,
  ExternalLink,
  Clock,
  MoreVertical
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useSignalStore } from '@/lib/signal-store' // Keep for streaming UI state
import { useKnowledge, useCreateKnowledge, useUpdateKnowledge, useDeleteKnowledge, signalKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

// Content type configuration
const CONTENT_TYPES = {
  faq: { label: 'FAQ', icon: HelpCircle, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  internal_note: { label: 'Internal Note', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  pricing: { label: 'Pricing', icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/20' },
  policy: { label: 'Policy', icon: Shield, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  testimonial: { label: 'Testimonial', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  team_bio: { label: 'Team Bio', icon: Users, color: 'text-pink-400', bg: 'bg-pink-500/20' },
  service_detail: { label: 'Service Detail', icon: Briefcase, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  process: { label: 'Process', icon: Workflow, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  location: { label: 'Location', icon: MapPin, color: 'text-red-400', bg: 'bg-red-500/20' },
  custom: { label: 'Custom', icon: Tag, color: 'text-gray-400', bg: 'bg-gray-500/20' }
}

export default function SignalKnowledgeManager({ projectId, className }) {
  const {
    knowledge,
    knowledgeLoading,
    knowledgePagination,
    knowledgeStats,
    fetchKnowledge,
    addKnowledge,
    updateKnowledge,
    deleteKnowledge
  } = useSignalStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeType, setActiveType] = useState('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingChunk, setEditingChunk] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    content: '',
    content_type: 'custom',
    source_title: '',
    source_url: '',
    tags: []
  })
  const [formLoading, setFormLoading] = useState(false)

  // Fetch knowledge on mount and when filters change
  useEffect(() => {
    if (projectId) {
      fetchKnowledge(projectId, {
        search: searchQuery || undefined,
        contentType: activeType !== 'all' ? activeType : undefined
      })
    }
  }, [projectId, searchQuery, activeType])

  const handleSearch = useCallback((e) => {
    setSearchQuery(e.target.value)
  }, [])

  const handleOpenAdd = () => {
    setFormData({
      content: '',
      content_type: 'custom',
      source_title: '',
      source_url: '',
      tags: []
    })
    setEditingChunk(null)
    setIsAddDialogOpen(true)
  }

  const handleOpenEdit = (chunk) => {
    setFormData({
      content: chunk.content,
      content_type: chunk.content_type,
      source_title: chunk.source_title || '',
      source_url: chunk.source_url || '',
      tags: chunk.tags || []
    })
    setEditingChunk(chunk)
    setIsAddDialogOpen(true)
  }

  const handleSubmit = async () => {
    setFormLoading(true)
    try {
      if (editingChunk) {
        await updateKnowledge(projectId, editingChunk.id, formData)
      } else {
        await addKnowledge(projectId, formData)
      }
      setIsAddDialogOpen(false)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id) => {
    await deleteKnowledge(id)
    setDeleteConfirmId(null)
  }

  const typeStats = knowledgeStats?.byType || {}

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/20">
              <BookOpen className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>
                {knowledgeStats?.total || 0} knowledge chunks for Signal AI
              </CardDescription>
            </div>
          </div>
          
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Knowledge
          </Button>
        </div>

        {/* Search and filter bar */}
        <div className="flex gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search knowledge..."
              className="pl-10"
            />
          </div>
          
          <Select value={activeType} onValueChange={setActiveType}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(CONTENT_TYPES).map(([type, config]) => (
                <SelectItem key={type} value={type}>
                  <span className="flex items-center gap-2">
                    <config.icon className={cn('h-4 w-4', config.color)} />
                    {config.label}
                    {typeStats[type] ? ` (${typeStats[type]})` : ''}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {/* Type tabs for quick filtering */}
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
          <Badge
            variant={activeType === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setActiveType('all')}
          >
            All ({knowledgeStats?.total || 0})
          </Badge>
          {Object.entries(CONTENT_TYPES).map(([type, config]) => (
            typeStats[type] > 0 && (
              <Badge
                key={type}
                variant={activeType === type ? 'default' : 'outline'}
                className={cn('cursor-pointer gap-1', activeType === type && config.bg)}
                onClick={() => setActiveType(type)}
              >
                <config.icon className={cn('h-3 w-3', config.color)} />
                {config.label} ({typeStats[type]})
              </Badge>
            )
          ))}
        </div>

        {/* Knowledge list */}
        {knowledgeLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : knowledge.length === 0 ? (
          <EmptyState onAdd={handleOpenAdd} searchQuery={searchQuery} />
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            <AnimatePresence>
              {knowledge.map((chunk) => (
                <KnowledgeChunkCard
                  key={chunk.id}
                  chunk={chunk}
                  onEdit={() => handleOpenEdit(chunk)}
                  onDelete={() => setDeleteConfirmId(chunk.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {knowledgePagination?.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              disabled={knowledgePagination.page <= 1}
              onClick={() => fetchKnowledge(projectId, { page: knowledgePagination.page - 1 })}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {knowledgePagination.page} of {knowledgePagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={knowledgePagination.page >= knowledgePagination.pages}
              onClick={() => fetchKnowledge(projectId, { page: knowledgePagination.page + 1 })}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingChunk ? 'Edit Knowledge Chunk' : 'Add Knowledge'}
            </DialogTitle>
            <DialogDescription>
              Add information that Signal AI can use to answer questions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="content_type">Content Type</Label>
              <Select
                value={formData.content_type}
                onValueChange={(v) => setFormData(prev => ({ ...prev, content_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTENT_TYPES).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      <span className="flex items-center gap-2">
                        <config.icon className={cn('h-4 w-4', config.color)} />
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter the knowledge content..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Keep chunks focused on a single topic for best retrieval (~500 tokens)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source_title">Source Title</Label>
                <Input
                  id="source_title"
                  value={formData.source_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, source_title: e.target.value }))}
                  placeholder="e.g., Services Page"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source_url">Source URL</Label>
                <Input
                  id="source_url"
                  value={formData.source_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, source_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.content || formLoading}>
              {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingChunk ? 'Update' : 'Add Knowledge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Knowledge Chunk?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this knowledge from Signal AI.
              The AI will no longer be able to reference this information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

// Knowledge chunk card component
function KnowledgeChunkCard({ chunk, onEdit, onDelete }) {
  const typeConfig = CONTENT_TYPES[chunk.content_type] || CONTENT_TYPES.custom

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={cn(
        'p-4 rounded-lg border transition-colors',
        'bg-[var(--glass-bg)] hover:bg-accent/5'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full shrink-0',
          typeConfig.bg
        )}>
          <typeConfig.icon className={cn('h-4 w-4', typeConfig.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className={cn('text-xs', typeConfig.bg, typeConfig.color)}>
              {typeConfig.label}
            </Badge>
            {chunk.source_title && (
              <span className="text-xs text-muted-foreground truncate">
                {chunk.source_title}
              </span>
            )}
            {chunk.source_url && (
              <a
                href={chunk.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <p className="text-sm text-foreground line-clamp-3">
            {chunk.content}
          </p>

          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(chunk.created_at).toLocaleDateString()}
            </span>
            {chunk.usage_count > 0 && (
              <span>Used {chunk.usage_count}×</span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  )
}

// Empty state component
function EmptyState({ onAdd, searchQuery }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      {searchQuery ? (
        <>
          <h3 className="font-medium mb-1">No results found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Try adjusting your search or filters
          </p>
        </>
      ) : (
        <>
          <h3 className="font-medium mb-1">No knowledge added yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add knowledge to help Signal AI answer questions accurately
          </p>
          <Button onClick={onAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Your First Knowledge
          </Button>
        </>
      )}
    </div>
  )
}
