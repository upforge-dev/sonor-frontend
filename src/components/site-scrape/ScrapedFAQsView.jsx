// Scraped FAQs View - Review and import FAQs from site scrape
import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  HelpCircle,
  Check,
  RefreshCw,
  Download,
  FileQuestion,
  Code,
  Layout,
  List,
  Heading,
  ChevronDown,
} from 'lucide-react'
import { portalApi } from '@/lib/sonor-api'

const SOURCE_ICONS = {
  schema: Code,
  accordion: Layout,
  'definition-list': List,
  'heading-pattern': Heading,
  'details-element': ChevronDown,
}

const SOURCE_LABELS = {
  schema: 'JSON-LD Schema',
  accordion: 'Accordion',
  'definition-list': 'Definition List',
  'heading-pattern': 'Heading Pattern',
  'details-element': 'Details Element',
}

const SOURCE_COLORS = {
  schema: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  accordion: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'definition-list': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'heading-pattern': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'details-element': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
}

export function ScrapedFAQsView({ scrapeId, projectId, onImported }) {
  const [data, setData] = useState({ faqs: [], stats: null })
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [expandedPaths, setExpandedPaths] = useState(new Set())

  useEffect(() => {
    fetchFAQs()
  }, [scrapeId])

  const fetchFAQs = async () => {
    try {
      setLoading(true)
      const response = await portalApi.get(`/site-scrape/${scrapeId}/faqs`)
      setData(response)
      // Expand first path by default
      if (response.faqs?.length > 0) {
        const firstPath = response.faqs[0]?.page_path
        if (firstPath) setExpandedPaths(new Set([firstPath]))
      }
    } catch (err) {
      toast.error('Failed to load FAQs')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const togglePath = (path) => {
    setExpandedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const toggleSelection = async (faqIds, isSelected) => {
    try {
      await portalApi.post(`/site-scrape/${scrapeId}/faqs/selection`, {
        faqIds,
        isSelected,
      })
      // Update local state
      setData(prev => ({
        ...prev,
        faqs: prev.faqs.map(f => 
          faqIds.includes(f.id) ? { ...f, is_selected: isSelected } : f
        ),
        stats: {
          ...prev.stats,
          selected: prev.stats.selected + (isSelected ? faqIds.length : -faqIds.length),
        },
      }))
    } catch (err) {
      toast.error('Failed to update selection')
    }
  }

  const selectAll = () => {
    const ids = data.faqs.filter(f => !f.is_selected).map(f => f.id)
    if (ids.length > 0) toggleSelection(ids, true)
  }

  const deselectAll = () => {
    const ids = data.faqs.filter(f => f.is_selected).map(f => f.id)
    if (ids.length > 0) toggleSelection(ids, false)
  }

  const handleImport = async () => {
    if (!projectId) {
      toast.error('No project selected')
      return
    }

    const selectedCount = data.faqs.filter(f => f.is_selected && !f.imported_to_managed_faq_id).length
    if (selectedCount === 0) {
      toast.error('No FAQs selected for import')
      return
    }

    try {
      setImporting(true)
      const result = await portalApi.post(`/site-scrape/${scrapeId}/faqs/import`, {
        projectId,
        groupByPath: true,
      })
      toast.success(`Imported ${result.imported} FAQs into ${result.sections.length} sections`)
      fetchFAQs() // Refresh to show imported status
      onImported?.()
    } catch (err) {
      toast.error('Failed to import FAQs')
      console.error(err)
    } finally {
      setImporting(false)
    }
  }

  // Group FAQs by path
  const faqsByPath = data.faqs.reduce((acc, faq) => {
    const path = faq.page_path || '/'
    if (!acc[path]) acc[path] = []
    acc[path].push(faq)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
      </div>
    )
  }

  if (data.faqs.length === 0) {
    return (
      <div className="text-center py-12 bg-[var(--surface-secondary)] rounded-lg">
        <FileQuestion className="h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-4" />
        <h3 className="text-lg font-medium mb-2">No FAQs Found</h3>
        <p className="text-[var(--text-secondary)]">
          No FAQ content was detected on the scraped pages.
        </p>
      </div>
    )
  }

  const selectedCount = data.faqs.filter(f => f.is_selected).length
  const importableCount = data.faqs.filter(f => f.is_selected && !f.imported_to_managed_faq_id).length
  const importedCount = data.stats?.imported || 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Extracted FAQs ({data.stats?.total || 0})
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {selectedCount} selected • {importedCount} already imported
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            Deselect All
          </Button>
          <Button 
            size="sm" 
            onClick={handleImport}
            disabled={importing || importableCount === 0}
            className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)]"
          >
            {importing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Import {importableCount} FAQs
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Source breakdown */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(data.stats?.bySource || {}).map(([source, count]) => {
          const Icon = SOURCE_ICONS[source] || FileQuestion
          return (
            <Badge
              key={source}
              variant="outline"
              className={cn('gap-1', SOURCE_COLORS[source])}
            >
              <Icon className="h-3 w-3" />
              {SOURCE_LABELS[source] || source}: {count}
            </Badge>
          )
        })}
      </div>

      {/* FAQs grouped by path */}
      <ScrollArea className="h-[400px] border border-[var(--glass-border)] rounded-lg">
        <div className="p-2 space-y-2">
          {Object.entries(faqsByPath).map(([path, faqs]) => {
            const isExpanded = expandedPaths.has(path)
            const pathSelectedCount = faqs.filter(f => f.is_selected).length
            const pathImportedCount = faqs.filter(f => f.imported_to_managed_faq_id).length

            return (
              <div key={path} className="border border-[var(--glass-border)] rounded-lg">
                <button
                  onClick={() => togglePath(path)}
                  className="w-full flex items-center justify-between p-3 hover:bg-[var(--surface-secondary)]"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{path}</Badge>
                    <span className="text-sm text-[var(--text-secondary)]">
                      {faqs.length} FAQs
                    </span>
                    {pathImportedCount > 0 && (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <Check className="h-3 w-3 mr-1" />
                        {pathImportedCount} imported
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {pathSelectedCount}/{faqs.length} selected
                    </span>
                    <ChevronDown className={cn(
                      'h-4 w-4 text-[var(--text-tertiary)] transition-transform',
                      isExpanded && 'rotate-180'
                    )} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[var(--glass-border)] p-3 space-y-3">
                    {faqs.map((faq, index) => {
                      const SourceIcon = SOURCE_ICONS[faq.source] || FileQuestion
                      
                      return (
                        <div
                          key={faq.id}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-lg border',
                            faq.imported_to_managed_faq_id 
                              ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                              : faq.is_selected 
                                ? 'bg-[var(--brand-primary)]/5 border-[var(--brand-primary)]/20'
                                : 'bg-[var(--surface-secondary)] border-transparent opacity-60'
                          )}
                        >
                          <Checkbox
                            checked={faq.is_selected}
                            onCheckedChange={(checked) => toggleSelection([faq.id], !!checked)}
                            disabled={!!faq.imported_to_managed_faq_id}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-[var(--text-tertiary)]">Q{index + 1}</span>
                              <Badge
                                variant="outline"
                                className={cn('text-xs', SOURCE_COLORS[faq.source])}
                              >
                                <SourceIcon className="h-3 w-3 mr-1" />
                                {SOURCE_LABELS[faq.source] || faq.source}
                              </Badge>
                              {faq.imported_to_managed_faq_id && (
                                <Badge className="bg-green-100 text-green-700 text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  Imported
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium text-[var(--text-primary)] mb-1">
                              {faq.question}
                            </p>
                            <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                              {faq.answer}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Summary */}
      <div className="bg-[var(--surface-secondary)] rounded-lg p-4">
        <h4 className="font-medium text-[var(--text-primary)] mb-2">Import Summary</h4>
        <p className="text-sm text-[var(--text-secondary)]">
          Importing will create <strong>Managed FAQ sections</strong> in the SEO module, 
          grouped by page path. Each section will include JSON-LD FAQPage schema for SEO.
        </p>
        <p className="text-xs text-[var(--text-tertiary)] mt-2">
          Tip: Review and edit imported FAQs in SEO → Managed FAQs before publishing.
        </p>
      </div>
    </div>
  )
}

export default ScrapedFAQsView
