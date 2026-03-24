import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  FileText,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Home,
  Info,
  ShoppingBag,
  Mail,
  Users,
  HelpCircle,
  FileQuestion,
  Trash2,
  Eye,
  Download,
  RefreshCw,
} from 'lucide-react'
import { portalApi } from '@/lib/sonor-api'

const PAGE_TYPE_ICONS = {
  home: Home,
  about: Info,
  services: ShoppingBag,
  products: ShoppingBag,
  contact: Mail,
  team: Users,
  faq: HelpCircle,
  blog: FileText,
  'blog-post': FileText,
  portfolio: FileText,
  legal: FileText,
  pricing: ShoppingBag,
  landing: Home,
  other: FileQuestion,
}

const PAGE_TYPE_COLORS = {
  home: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  about: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  services: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  products: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  contact: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  team: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  blog: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'blog-post': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

export function ScrapedPagesView({ scrapeId, scrapeData, onRefresh }) {
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedPages, setSelectedPages] = useState(new Set())
  const [expandedPages, setExpandedPages] = useState(new Set())
  const [selectedType, setSelectedType] = useState(null)

  useEffect(() => {
    fetchPages()
  }, [scrapeId])

  const fetchPages = async () => {
    try {
      setLoading(true)
      const response = await portalApi.get(`/site-scrape/${scrapeId}/pages`)
      if (response.pages) {
        setPages(response.pages)
        // Select all by default
        setSelectedPages(new Set(response.pages.map((p) => p.id)))
      }
    } catch (err) {
      toast.error('Failed to load pages')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const togglePage = (pageId) => {
    const newSelected = new Set(selectedPages)
    if (newSelected.has(pageId)) {
      newSelected.delete(pageId)
    } else {
      newSelected.add(pageId)
    }
    setSelectedPages(newSelected)
  }

  const toggleExpand = (pageId) => {
    const newExpanded = new Set(expandedPages)
    if (newExpanded.has(pageId)) {
      newExpanded.delete(pageId)
    } else {
      newExpanded.add(pageId)
    }
    setExpandedPages(newExpanded)
  }

  const selectAll = () => {
    setSelectedPages(new Set(filteredPages.map((p) => p.id)))
  }

  const selectNone = () => {
    setSelectedPages(new Set())
  }

  // Filter pages
  const filteredPages = pages.filter((page) => {
    const matchesSearch =
      !search ||
      page.url?.toLowerCase().includes(search.toLowerCase()) ||
      page.title?.toLowerCase().includes(search.toLowerCase())
    const matchesType = !selectedType || page.page_type === selectedType
    return matchesSearch && matchesType
  })

  // Group pages by type
  const pagesByType = filteredPages.reduce((acc, page) => {
    const type = page.page_type || 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(page)
    return acc
  }, {})

  const pageTypes = Object.keys(pagesByType).sort()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Scraped Pages ({pages.length})
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Select pages to include in the new site
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={selectNone}>
            Select None
          </Button>
          <Button variant="outline" size="sm" onClick={fetchPages}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={selectedType === null ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedType(null)}
          >
            All
          </Badge>
          {pageTypes.map((type) => (
            <Badge
              key={type}
              variant={selectedType === type ? 'default' : 'outline'}
              className={cn('cursor-pointer', selectedType === type && PAGE_TYPE_COLORS[type])}
              onClick={() => setSelectedType(selectedType === type ? null : type)}
            >
              {type} ({pagesByType[type].length})
            </Badge>
          ))}
        </div>
      </div>

      {/* Selection summary */}
      <div className="bg-[var(--surface-secondary)] rounded-lg p-3 flex items-center justify-between">
        <span className="text-sm text-[var(--text-secondary)]">
          {selectedPages.size} of {pages.length} pages selected for import
        </span>
        {selectedPages.size > 0 && selectedPages.size !== pages.length && (
          <span className="text-xs text-[var(--text-tertiary)]">
            {pages.length - selectedPages.size} pages will be excluded
          </span>
        )}
      </div>

      {/* Pages list */}
      <ScrollArea className="h-[400px] border border-[var(--glass-border)] rounded-lg">
        <div className="p-2 space-y-1">
          {filteredPages.map((page) => {
            const Icon = PAGE_TYPE_ICONS[page.page_type] || FileQuestion
            const isSelected = selectedPages.has(page.id)
            const isExpanded = expandedPages.has(page.id)

            return (
              <div key={page.id}>
                <div
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--surface-hover)] transition-colors',
                    isSelected
                      ? 'bg-[var(--brand-primary)]/5'
                      : 'bg-[var(--surface-secondary)]'
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => togglePage(page.id)}
                  />

                  <button
                    onClick={() => toggleExpand(page.id)}
                    className="p-1 hover:bg-[var(--surface-hover)] rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
                    )}
                  </button>

                  <div
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-lg',
                      PAGE_TYPE_COLORS[page.page_type] || PAGE_TYPE_COLORS.other
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text-primary)] truncate">
                      {page.title || 'Untitled Page'}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] truncate">
                      {page.url}
                    </p>
                  </div>

                  <Badge variant="outline" className="shrink-0">
                    {page.page_type || 'unknown'}
                  </Badge>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => window.open(page.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>

                {isExpanded && (
                  <div className="ml-14 mr-4 mt-1 mb-2 p-4 bg-[var(--surface-secondary)] rounded-lg space-y-3">
                    {page.meta_description && (
                      <div>
                        <p className="text-xs font-medium text-[var(--text-tertiary)] mb-1">
                          Meta Description
                        </p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {page.meta_description}
                        </p>
                      </div>
                    )}

                    {page.headings && page.headings.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-[var(--text-tertiary)] mb-1">
                          Headings ({page.headings.length})
                        </p>
                        <div className="space-y-1">
                          {page.headings.slice(0, 5).map((h, i) => (
                            <p
                              key={i}
                              className={cn(
                                'text-sm text-[var(--text-secondary)]',
                                h.level === 1 && 'font-bold',
                                h.level === 2 && 'font-semibold ml-2',
                                h.level >= 3 && 'ml-4'
                              )}
                            >
                              {'#'.repeat(h.level)} {h.text}
                            </p>
                          ))}
                          {page.headings.length > 5 && (
                            <p className="text-xs text-[var(--text-tertiary)]">
                              +{page.headings.length - 5} more headings
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {page.word_count > 0 && (
                      <div className="flex gap-4 text-xs text-[var(--text-tertiary)]">
                        <span>{page.word_count.toLocaleString()} words</span>
                        <span>{page.images_count || 0} images</span>
                        <span>{page.links_count || 0} links</span>
                      </div>
                    )}

                    {page.ai_analysis && (
                      <div className="pt-2 border-t border-[var(--glass-border)]">
                        <p className="text-xs font-medium text-[var(--text-tertiary)] mb-1">
                          AI Analysis
                        </p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {page.ai_analysis.primary_purpose || 'No analysis available'}
                        </p>
                        {page.ai_analysis.key_messages && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {page.ai_analysis.key_messages.slice(0, 3).map((msg, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {msg}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {filteredPages.length === 0 && (
            <div className="text-center py-8 text-[var(--text-tertiary)]">
              {search ? 'No pages match your search' : 'No pages found'}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default ScrapedPagesView
