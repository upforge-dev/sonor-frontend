// src/components/engage/editor/EngageComponentsPanel.jsx
// Left panel - Components, Media, Commerce, AI

import { useState, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Type,
  Image as ImageIcon,
  Square,
  Sparkles,
  Search,
  ShoppingBag,
  LayoutGrid,
  Box,
  Video,
  Link,
  FileText,
  Folder,
  ChevronRight,
  Plus,
  Send,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { filesApi, commerceApi } from '@/lib/sonor-api'
import SignalIcon from '@/components/ui/SignalIcon'

// Element blocks
const ELEMENT_BLOCKS = [
  {
    category: 'Content',
    items: [
      { type: 'heading', label: 'Heading', icon: Type, description: 'Large title text' },
      { type: 'text', label: 'Text Block', icon: FileText, description: 'Body content' },
      { type: 'image', label: 'Image', icon: ImageIcon, description: 'Add an image' },
      { type: 'video', label: 'Video', icon: Video, description: 'Embed video' },
    ]
  },
  {
    category: 'Actions',
    items: [
      { type: 'button', label: 'Button', icon: Square, description: 'CTA button' },
      { type: 'link', label: 'Link', icon: Link, description: 'Text link' },
    ]
  },
  {
    category: 'Layout',
    items: [
      { type: 'divider', label: 'Divider', icon: LayoutGrid, description: 'Horizontal line' },
      { type: 'spacer', label: 'Spacer', icon: Box, description: 'Add spacing' },
    ]
  },
]

// Component item for drag or click to add
function ComponentItem({ item, onAdd }) {
  const Icon = item.icon
  
  return (
    <button
      onClick={() => onAdd(item)}
      className="flex items-center gap-3 p-3 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--glass-bg)] hover:border-[var(--brand-primary)]/50 transition-colors text-left w-full"
    >
      <div
        className="p-2 rounded-lg"
        style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
      >
        <Icon className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
      </div>
      <div>
        <div className="font-medium text-sm">{item.label}</div>
        <div className="text-xs text-muted-foreground">{item.description}</div>
      </div>
    </button>
  )
}

// Media file item
function MediaItem({ file, onSelect }) {
  const isImage = file.content_type?.startsWith('image/')
  
  return (
    <button
      onClick={() => onSelect(file)}
      className="relative aspect-square rounded-lg border border-[var(--glass-border)] hover:border-[var(--brand-primary)] overflow-hidden transition-colors"
    >
      {isImage ? (
        <img
          src={file.public_url}
          alt={file.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        <div className="text-xs text-white truncate">{file.name}</div>
      </div>
    </button>
  )
}

// Commerce product/service item
function CommerceItem({ offering, onSelect }) {
  return (
    <button
      onClick={() => onSelect(offering)}
      className="flex items-center gap-3 p-3 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--glass-bg)] hover:border-[var(--brand-primary)]/50 transition-colors text-left w-full"
    >
      {offering.images?.[0] ? (
        <img
          src={offering.images[0]}
          alt={offering.name}
          className="w-12 h-12 rounded-lg object-cover"
        />
      ) : (
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
        >
          <ShoppingBag className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{offering.name}</div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {offering.type}
          </Badge>
          {offering.price && (
            <span className="text-xs text-muted-foreground">
              ${offering.price}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// AI Chat message
function ChatMessage({ message, isUser }) {
  return (
    <div className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <div
          className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
        >
          <SignalIcon className="h-3 w-3" style={{ color: 'var(--brand-primary)' }} />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] p-2 rounded-lg text-sm",
          isUser
            ? "bg-[var(--brand-primary)] text-white"
            : "bg-[var(--glass-bg)] border border-[var(--glass-border)]"
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

export default function EngageComponentsPanel({
  element,
  onUpdateElement,
  onAddBlock,
  onSelectMedia,
  onSelectOffering,
  activeTab,
  onTabChange,
  projectId,
  brandColors
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [mediaFiles, setMediaFiles] = useState([])
  const [offerings, setOfferings] = useState([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [offeringsLoading, setOfferingsLoading] = useState(false)
  
  // AI Chat state
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: "Hi! I'm Signal. Tell me what you want to create and I'll help design it. Try: 'Create a welcome popup with a special offer'" }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  
  // Load media files when tab opens
  useEffect(() => {
    if (activeTab === 'media' && mediaFiles.length === 0) {
      loadMediaFiles()
    }
  }, [activeTab])
  
  // Load commerce offerings when tab opens
  useEffect(() => {
    if (activeTab === 'commerce' && offerings.length === 0) {
      loadOfferings()
    }
  }, [activeTab])
  
  const loadMediaFiles = async () => {
    if (!projectId) return
    setMediaLoading(true)
    try {
      // Try to load from Engage folder first
      const result = await filesApi.list(projectId, { path: 'Engage' })
      setMediaFiles(result.files || [])
    } catch (err) {
      console.error('Error loading media files:', err)
      // Fall back to all images
      try {
        const result = await filesApi.list(projectId, { content_type: 'image' })
        setMediaFiles(result.files || [])
      } catch (e) {
        console.error('Error loading all files:', e)
      }
    } finally {
      setMediaLoading(false)
    }
  }
  
  const loadOfferings = async () => {
    if (!projectId) return
    setOfferingsLoading(true)
    try {
      const result = await commerceApi.getOfferings(projectId)
      setOfferings(result.offerings || result || [])
    } catch (err) {
      console.error('Error loading offerings:', err)
    } finally {
      setOfferingsLoading(false)
    }
  }
  
  const handleAIChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    
    const userMessage = { role: 'user', content: chatInput }
    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setChatLoading(true)
    
    try {
      // In production, this would call Signal API
      // For now, simulate a response
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const assistantMessage = {
        role: 'assistant',
        content: `I'd suggest creating a ${element.element_type} with your brand colors. Would you like me to set up the headline, body text, and CTA button? I can also suggest optimal trigger timing based on your page data.`
      }
      setChatMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      console.error('AI chat error:', err)
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting. Please try again in a moment."
      }])
    } finally {
      setChatLoading(false)
    }
  }
  
  // Filter components by search
  const filteredBlocks = ELEMENT_BLOCKS.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0)
  
  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="p-2 border-b border-[var(--glass-border)]">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="components" className="text-xs px-2">
              <LayoutGrid className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="media" className="text-xs px-2">
              <ImageIcon className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="commerce" className="text-xs px-2">
              <ShoppingBag className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="ai" className="text-xs px-2">
              <SignalIcon className="h-3 w-3" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* ═══════════════════════════════════════════════════════════════════
              COMPONENTS TAB
              ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'components' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search components..."
                  className="pl-8"
                />
              </div>
              
              {/* Component categories */}
              {filteredBlocks.map(category => (
                <div key={category.category}>
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    {category.category}
                  </div>
                  <div className="space-y-2">
                    {category.items.map(item => (
                      <ComponentItem
                        key={item.type}
                        item={item}
                        onAdd={onAddBlock}
                      />
                    ))}
                  </div>
                </div>
              ))}
              
              {filteredBlocks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <LayoutGrid className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No components match your search</p>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              MEDIA TAB
              ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'media' && (
            <div className="space-y-4">
              {/* Upload button */}
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Upload Image
              </Button>
              
              {/* Folder notice */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                <Folder className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Engage folder images</span>
              </div>
              
              {/* Media grid */}
              {mediaLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : mediaFiles.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {mediaFiles.map(file => (
                    <MediaItem
                      key={file.id}
                      file={file}
                      onSelect={onSelectMedia}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No images in Engage folder</p>
                  <p className="text-xs mt-1">Upload images or browse all files</p>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              COMMERCE TAB
              ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'commerce' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products & services..."
                  className="pl-8"
                />
              </div>
              
              {/* Offerings list */}
              {offeringsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : offerings.length > 0 ? (
                <div className="space-y-2">
                  {offerings
                    .filter(o => 
                      o.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      o.type?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(offering => (
                      <CommerceItem
                        key={offering.id}
                        offering={offering}
                        onSelect={onSelectOffering}
                      />
                    ))
                  }
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No products or services</p>
                  <p className="text-xs mt-1">Add offerings in Commerce module</p>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              AI TAB
              ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'ai' && (
            <div className="flex flex-col h-[calc(100vh-300px)]">
              {/* Chat messages */}
              <ScrollArea className="flex-1 mb-3">
                <div className="space-y-3 pr-2">
                  {chatMessages.map((msg, i) => (
                    <ChatMessage
                      key={i}
                      message={msg}
                      isUser={msg.role === 'user'}
                    />
                  ))}
                  {chatLoading && (
                    <div className="flex gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
                      >
                        <SignalIcon className="h-3 w-3 animate-pulse" style={{ color: 'var(--brand-primary)' }} />
                      </div>
                      <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] p-2 rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              {/* Chat input */}
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Describe what you want..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAIChat()}
                  disabled={chatLoading}
                />
                <Button
                  size="icon"
                  onClick={handleAIChat}
                  disabled={!chatInput.trim() || chatLoading}
                  style={{ 
                    backgroundColor: 'var(--brand-primary)',
                    color: 'white'
                  }}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Quick suggestions */}
              <div className="mt-3 space-y-1">
                <div className="text-xs text-muted-foreground mb-2">Try saying:</div>
                {[
                  "Create a welcome popup with 10% discount",
                  "Make a slide-in for newsletter signup",
                  "Design a banner for our new service",
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setChatInput(suggestion)}
                    className="block w-full text-left text-xs p-2 rounded-md bg-[var(--glass-bg)] hover:bg-[var(--brand-primary)]/10 transition-colors"
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
