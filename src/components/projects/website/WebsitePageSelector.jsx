/**
 * WebsitePageSelector - Left sidebar page list for Website module.
 * Same hierarchy logic as Analytics: parent pages show sub-pages in a toggle.
 * Pages come from sitemap; users select an existing page (no "Add page").
 */
import { useState, useMemo, useEffect } from 'react'
import { FileText, Search, Loader2, ChevronRight, ChevronDown, Database } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

function formatPageName(segment) {
  if (!segment || segment === '') return 'Home'
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Same title as Analytics per-page view (PageAnalyticsView): path-based only.
 * Returns "Home" for / or empty path, otherwise the last path segment (e.g. "about" for /about).
 * Render with className "capitalize" to match Analytics (e.g. "About").
 */
function getAnalyticsStylePageName(path) {
  if (!path || path === '/') return 'Home'
  return path.split('/').filter(Boolean).pop() || path
}

/**
 * Build hierarchical page structure from flat page list (same logic as Analytics buildHierarchy).
 * Each node: { path, name, children, isOpen, page? }. name uses same logic as Analytics per-page view (path-based).
 */
function buildPageHierarchy(pages, openPaths = new Set()) {
  if (!pages || pages.length === 0) return []

  const sortedPages = [...pages].sort((a, b) => {
    const pathA = a.path || (a.url ? new URL(a.url, 'https://x').pathname : '') || ''
    const pathB = b.path || (b.url ? new URL(b.url, 'https://x').pathname : '') || ''
    return pathA.localeCompare(pathB, undefined, { sensitivity: 'base' })
  })

  // Deduplicate by path: keep one page per path (prefer first by sort order)
  const seenPaths = new Set()
  const dedupedPages = sortedPages.filter((p) => {
    const path = p.path || (p.url ? new URL(p.url, 'https://x').pathname : '') || '/'
    const norm = path === '' ? '/' : path.replace(/\/+$/, '') || '/'
    if (seenPaths.has(norm)) return false
    seenPaths.add(norm)
    return true
  })

  const hierarchy = []
  const pathMap = new Map()

  for (const page of dedupedPages) {
    const path = page.path || (page.url ? new URL(page.url, 'https://x').pathname : '') || '/'
    const segments = path.split('/').filter(Boolean)

    if (segments.length === 0) {
      // Deduplicate: only one Home node even if multiple pages have path /
      let homeNode = pathMap.get('/')
      if (!homeNode) {
        homeNode = {
          path: '/',
          name: getAnalyticsStylePageName('/'),
          children: [],
          isOpen: openPaths.has('/'),
          page,
        }
        hierarchy.push(homeNode)
        pathMap.set('/', homeNode)
      } else {
        homeNode.page = page
      }
      continue
    }

    let currentLevel = hierarchy
    let currentPath = ''

    for (let i = 0; i < segments.length; i++) {
      currentPath += '/' + segments[i]
      const isLeaf = i === segments.length - 1

      let node = currentLevel.find((n) => n.path === currentPath)

      if (!node) {
        node = {
          path: currentPath,
          name: getAnalyticsStylePageName(currentPath),
          children: [],
          isOpen: openPaths.has(currentPath),
          ...(isLeaf ? { page } : {}),
        }
        currentLevel.push(node)
        pathMap.set(currentPath, node)
      } else if (isLeaf) {
        node.page = page
        node.name = getAnalyticsStylePageName(currentPath)
      }

      currentLevel = node.children
    }
  }

  return hierarchy
}

function PageTreeNode({ node, depth = 0, selectedPage, onSelectPage, onToggle }) {
  const hasChildren = node.children && node.children.length > 0
  const isCmsPage = !!node.page?._cmsPage
  const isSelected =
    selectedPage &&
    (selectedPage.path === node.path ||
      (selectedPage.id && selectedPage.id === node.page?.id) ||
      (!selectedPage.id && selectedPage.path === node.path))

  const handleSelect = () => {
    const pageToSelect = node.page || { path: node.path, title: node.name }
    onSelectPage(pageToSelect)
  }

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors',
          'hover:bg-muted',
          isSelected && 'bg-primary/10 text-primary'
        )}
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(node.path)
            }}
            className="p-0.5 hover:bg-muted rounded shrink-0"
            aria-label={node.isOpen ? 'Collapse' : 'Expand'}
          >
            {node.isOpen ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-4 shrink-0" />}
        <button
          type="button"
          onClick={handleSelect}
          className={cn(
            'flex items-center gap-2 text-left truncate flex-1 min-w-0',
            isSelected ? 'text-primary' : 'text-foreground'
          )}
        >
          {isCmsPage ? (
            <Database
              className={cn(
                'h-3.5 w-3.5 shrink-0',
                isSelected ? 'text-primary' : 'text-violet-500'
              )}
            />
          ) : (
            <FileText
              className={cn(
                'h-3.5 w-3.5 shrink-0',
                isSelected ? 'text-primary' : 'text-muted-foreground'
              )}
            />
          )}
          <span className="truncate capitalize">{node.name}</span>
        </button>
      </div>
      {hasChildren && node.isOpen && (
        <div className="ml-0">
          {node.children.map((child) => (
            <PageTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPage={selectedPage}
              onSelectPage={onSelectPage}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function WebsitePageSelector({
  projectId,
  pages = [],
  selectedPage,
  onSelectPage,
  isLoading = false,
}) {
  const [search, setSearch] = useState('')
  const [openPaths, setOpenPaths] = useState(() => new Set())

  // Expand parents when selected page changes (same as Analytics expandToPath)
  useEffect(() => {
    const path = selectedPage?.path ?? (selectedPage?.url ? new URL(selectedPage.url, 'https://x').pathname : '') ?? ''
    if (!path || path === '/') return
    const segments = path.split('/').filter(Boolean)
    let currentPath = ''
    setOpenPaths((prev) => {
      const next = new Set(prev)
      for (const segment of segments) {
        currentPath += '/' + segment
        next.add(currentPath)
      }
      return next
    })
  }, [selectedPage?.path, selectedPage?.url])

  const pageList = Array.isArray(pages) ? pages : pages?.pages ?? []

  const filteredPages = useMemo(() => {
    if (!search.trim()) return pageList
    const q = search.toLowerCase().trim()
    return pageList.filter(
      (p) =>
        (p.path || '').toLowerCase().includes(q) ||
        (p.title || '').toLowerCase().includes(q) ||
        (p.url || '').toLowerCase().includes(q)
    )
  }, [pageList, search])

  const hierarchy = useMemo(
    () => buildPageHierarchy(filteredPages, openPaths),
    [filteredPages, openPaths]
  )

  const toggleNode = (path) => {
    setOpenPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  if (!projectId) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Select a project to view pages.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Loading pages...</span>
      </div>
    )
  }

  if (pageList.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">No pages yet</p>
        <p>
          Pages are pulled from the sitemap at build time. Sync or crawl your site to populate pages.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b shrink-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Pages
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {hierarchy.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No pages match &quot;{search}&quot;
            </div>
          ) : (
            hierarchy.map((node) => (
              <PageTreeNode
                key={node.path}
                node={node}
                selectedPage={selectedPage}
                onSelectPage={onSelectPage}
                onToggle={toggleNode}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
