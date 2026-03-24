import { useState, useMemo, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Search, 
  Layout, 
  Mail, 
  Megaphone, 
  Receipt, 
  PartyPopper,
  UserPlus,
  Sparkles,
  Eye,
  Check,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { emailApi } from '@/lib/sonor-api'

// Category icons
const categoryIcons = {
  all: Layout,
  welcome: UserPlus,
  newsletter: Mail,
  promotional: Megaphone,
  transactional: Receipt,
  announcement: PartyPopper,
  reengagement: Sparkles
}

// Template preview iframe
function TemplatePreview({ html, scale = 0.3 }) {
  const previewHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            background: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `
  
  return (
    <div 
      className="relative overflow-hidden bg-white rounded-lg border border-border"
      style={{ height: '200px' }}
    >
      <iframe
        srcDoc={previewHtml}
        className="absolute top-0 left-0 w-full pointer-events-none"
        style={{
          width: `${100 / scale}%`,
          height: `${100 / scale}%`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          border: 'none'
        }}
        title="Template preview"
      />
    </div>
  )
}

// Full preview modal
function FullPreviewModal({ template, open, onOpenChange }) {
  if (!template) return null
  
  const previewHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            background: #f5f5f7;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          ${template.html}
        </div>
      </body>
    </html>
  `
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border bg-background/95 backdrop-blur">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            {template.name}
          </DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden bg-[#f5f5f7] p-6">
          <iframe
            srcDoc={previewHtml}
            className="w-full h-[600px] rounded-lg shadow-lg"
            style={{ border: 'none' }}
            title="Full template preview"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Template card
function TemplateCard({ template, onSelect, onPreview, isSelected }) {
  return (
    <div 
      className={cn(
        "group relative rounded-xl border-2 transition-all duration-200 cursor-pointer",
        "hover:border-primary/50 hover:shadow-lg hover:-translate-y-1",
        isSelected 
          ? "border-primary bg-primary/5 shadow-md" 
          : "border-border bg-[var(--glass-bg)]"
      )}
      onClick={() => onSelect(template)}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
          <Check className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      
      {/* Preview */}
      <div className="p-3">
        <TemplatePreview html={template.html} />
      </div>
      
      {/* Info */}
      <div className="px-4 pb-4">
        <h3 className="font-semibold text-sm text-foreground mb-1 truncate">
          {template.name}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {template.description}
        </p>
      </div>
      
      {/* Hover overlay */}
      <div className={cn(
        "absolute inset-0 flex items-center justify-center gap-2 bg-background/80 backdrop-blur-sm",
        "opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
      )}>
        <Button 
          size="sm" 
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation()
            onPreview(template)
          }}
        >
          <Eye className="h-3.5 w-3.5 mr-1" />
          Preview
        </Button>
        <Button 
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onSelect(template)
          }}
        >
          {isSelected ? 'Selected' : 'Use Template'}
        </Button>
      </div>
    </div>
  )
}

// Main gallery component
export function TemplateGallery({ open, onOpenChange, onSelectTemplate }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [templates, setTemplates] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Fetch templates from API
  useEffect(() => {
    if (!open) return
    
    const fetchTemplates = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await emailApi.listTemplates()
        setTemplates(res.data.templates || [])
        setCategories(res.data.categories || [])
      } catch (err) {
        console.error('Failed to fetch templates:', err)
        setError('Failed to load templates')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchTemplates()
  }, [open])
  
  // Filter templates
  const filteredTemplates = useMemo(() => {
    let filtered = templates
    
    if (activeCategory !== 'all') {
      filtered = filtered.filter(t => t.category === activeCategory)
    }
    
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        (t.description || '').toLowerCase().includes(searchLower)
      )
    }
    
    return filtered
  }, [templates, activeCategory, search])
  
  // Handle selection
  const handleSelect = (template) => {
    setSelectedTemplate(template)
  }
  
  // Handle use template
  const handleUseTemplate = () => {
    if (selectedTemplate && onSelectTemplate) {
      onSelectTemplate(selectedTemplate)
      onOpenChange(false)
      setSelectedTemplate(null)
      setSearch('')
      setActiveCategory('all')
    }
  }
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Layout className="h-5 w-5" />
              Email Templates
            </DialogTitle>
            <DialogDescription>
              Choose a professionally designed template to get started quickly
            </DialogDescription>
          </DialogHeader>
          
          {/* Toolbar */}
          <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Categories */}
            <div className="flex items-center gap-2 overflow-x-auto">
              {categories.map(cat => {
                const Icon = categoryIcons[cat.id] || Layout
                const isActive = activeCategory === cat.id
                
                return (
                  <Button
                    key={cat.id}
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "shrink-0",
                      isActive && "shadow-md"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 mr-1.5" />
                    {cat.name}
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "ml-1.5 h-5 px-1.5 text-xs",
                        isActive && "bg-white/20 text-white"
                      )}
                    >
                      {cat.count}
                    </Badge>
                  </Button>
                )
              })}
            </div>
          </div>
          
          {/* Template Grid */}
          <ScrollArea className="flex-1 p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-20 text-muted-foreground">
                <p>{error}</p>
                <Button variant="outline" className="mt-4" onClick={() => setError(null)}>
                  Retry
                </Button>
              </div>
            ) : filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplate?.id === template.id}
                    onSelect={handleSelect}
                    onPreview={setPreviewTemplate}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-1">No templates found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or category filter
                </p>
              </div>
            )}
          </ScrollArea>
          
          {/* Footer */}
          <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
            </p>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                disabled={!selectedTemplate}
                onClick={handleUseTemplate}
                className="min-w-[140px]"
              >
                {selectedTemplate ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Use Template
                  </>
                ) : (
                  'Select a Template'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Full preview modal */}
      <FullPreviewModal 
        template={previewTemplate}
        open={!!previewTemplate}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
      />
    </>
  )
}

export default TemplateGallery
