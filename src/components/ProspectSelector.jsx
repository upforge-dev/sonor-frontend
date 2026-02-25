// src/components/ProspectSelector.jsx
/**
 * Searchable Prospect/Client Selector
 *
 * Inline search input with a positioned results panel.
 * No Popover/cmdk -- uses native scrolling and click-outside.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Badge } from './ui/badge'
import {
  Search,
  Building2,
  Check,
  UserPlus,
  Mail,
  X,
  Loader2
} from 'lucide-react'
import { crmApi, adminApi } from '@/lib/portal-api'
import { cn } from '../lib/utils'

const STAGE_LABELS = {
  new_lead: 'New Lead',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal_sent: 'Proposal Sent',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost'
}

const STAGE_COLORS = {
  new_lead: 'bg-gray-500',
  contacted: 'bg-blue-500',
  qualified: 'bg-purple-500',
  proposal_sent: 'bg-orange-500',
  negotiation: 'bg-yellow-500',
  won: 'bg-green-500',
  lost: 'bg-red-500'
}

export default function ProspectSelector({
  value,
  onChange,
  placeholder = 'Search by name, company, or email...',
  className = '',
  showCreateNew = false,
  onCreateNew,
  disabled = false,
  revalidateKey
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [prospects, setProspects] = useState([])
  const [clients, setClients] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)

  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // ── Data fetching ──────────────────────────────────────────────

  const loadData = useCallback(async (force = false) => {
    if (hasLoaded && !force) return

    setIsLoading(true)
    try {
      const [prospectsRes, contactsRes] = await Promise.all([
        crmApi.listProspects(),
        adminApi.listUsers({ limit: 100 })
      ])

      setProspects(prospectsRes.data.prospects || prospectsRes.data || [])
      setClients(contactsRes.data.users || contactsRes.data || [])
      setHasLoaded(true)
    } catch (error) {
      console.error('Failed to load contacts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [hasLoaded])

  useEffect(() => {
    if (revalidateKey && hasLoaded) {
      loadData(true)
    }
  }, [revalidateKey])

  useEffect(() => {
    if (open && !hasLoaded) {
      loadData()
    }
  }, [open])

  // ── Filtering ──────────────────────────────────────────────────

  const filteredProspects = useMemo(() => {
    if (!search) return prospects
    const q = search.toLowerCase()
    return prospects.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.company?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    )
  }, [prospects, search])

  const filteredClients = useMemo(() => {
    if (!search) return clients
    const q = search.toLowerCase()
    return clients.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  }, [clients, search])

  // Flat list of all visible items for keyboard navigation
  const flatItems = useMemo(() => {
    const items = []
    filteredProspects.slice(0, 15).forEach(p => items.push({ item: p, type: 'prospect' }))
    filteredClients.slice(0, 50).forEach(c => items.push({ item: c, type: 'client' }))
    return items
  }, [filteredProspects, filteredClients])

  const selectedItem = useMemo(() => {
    if (!value) return null
    const prospect = prospects.find(p => p.id === value)
    if (prospect) return { ...prospect, type: 'prospect' }
    const client = clients.find(c => c.id === value)
    if (client) return { ...client, type: 'client' }
    return null
  }, [value, prospects, clients])

  // ── Actions ────────────────────────────────────────────────────

  const handleSelect = useCallback((item, type) => {
    onChange({
      id: item.id,
      type,
      name: item.name,
      email: item.email,
      company: item.company,
      phone: item.phone,
      website: item.website,
      industry: item.industry,
      pipelineStage: item.pipeline_stage
    })
    setOpen(false)
    setSearch('')
    setHighlightIdx(-1)
  }, [onChange])

  const handleClear = useCallback((e) => {
    e.stopPropagation()
    onChange({ id: '', type: '' })
    setSearch('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [onChange])

  // ── Click outside ──────────────────────────────────────────────

  useEffect(() => {
    if (!open) return
    const handleMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setHighlightIdx(-1)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  // ── Keyboard navigation ────────────────────────────────────────

  const handleKeyDown = useCallback((e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true)
        return
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIdx(prev => Math.min(prev + 1, flatItems.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIdx(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightIdx >= 0 && highlightIdx < flatItems.length) {
          const { item, type } = flatItems[highlightIdx]
          handleSelect(item, type)
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        setHighlightIdx(-1)
        inputRef.current?.blur()
        break
    }
  }, [open, highlightIdx, flatItems, handleSelect])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx < 0 || !listRef.current) return
    const el = listRef.current.querySelector(`[data-idx="${highlightIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlightIdx])

  // Reset highlight when search changes
  useEffect(() => { setHighlightIdx(-1) }, [search])

  // ── Render helpers ─────────────────────────────────────────────

  const ResultRow = ({ item, type, idx }) => {
    const isProspect = type === 'prospect'
    const isHighlighted = idx === highlightIdx
    const isSelected = value === item.id

    return (
      <button
        type="button"
        data-idx={idx}
        onClick={() => handleSelect(item, type)}
        onMouseEnter={() => setHighlightIdx(idx)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
          isHighlighted
            ? 'bg-accent text-accent-foreground'
            : 'hover:bg-accent/50'
        )}
      >
        <div className={cn(
          'h-8 w-8 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0',
          isProspect
            ? 'bg-gradient-to-br from-purple-500 to-pink-600'
            : 'bg-gradient-to-br from-green-500 to-teal-600'
        )}>
          {item.name?.charAt(0)?.toUpperCase() || '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-[var(--text-primary)] truncate">
              {item.name}
            </span>
            {isProspect && item.pipeline_stage && (
              <Badge
                variant="secondary"
                className={cn('text-[10px] px-1.5 py-0 text-white', STAGE_COLORS[item.pipeline_stage])}
              >
                {STAGE_LABELS[item.pipeline_stage]}
              </Badge>
            )}
            {!isProspect && item.role === 'client' && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-green-500 text-green-500">
                Client
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            {item.company && (
              <>
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{item.company}</span>
              </>
            )}
            {item.email && (
              <>
                <Mail className="h-3 w-3 ml-1 flex-shrink-0" />
                <span className="truncate">{item.email}</span>
              </>
            )}
          </div>
        </div>

        {isSelected && (
          <Check className="h-4 w-4 text-[var(--brand-primary)] flex-shrink-0" />
        )}
      </button>
    )
  }

  // ── Main render ────────────────────────────────────────────────

  const hasResults = filteredProspects.length > 0 || filteredClients.length > 0

  let runningIdx = 0

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Selected state: compact card */}
      {selectedItem && !open ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors',
            'glass-bg border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50',
            disabled && 'opacity-50 pointer-events-none'
          )}
        >
          <div className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0',
            selectedItem.type === 'prospect'
              ? 'bg-gradient-to-br from-purple-500 to-pink-600'
              : 'bg-gradient-to-br from-green-500 to-teal-600'
          )}>
            {selectedItem.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-[var(--text-primary)] truncate">
                {selectedItem.name}
              </span>
              <Badge
                variant="secondary"
                className={cn(
                  'text-[10px] px-1.5 py-0',
                  selectedItem.type === 'prospect'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                )}
              >
                {selectedItem.type === 'prospect' ? 'Prospect' : (selectedItem.role === 'client' ? 'Client' : 'Contact')}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              {selectedItem.company && <span className="truncate">{selectedItem.company}</span>}
              {selectedItem.company && selectedItem.email && <span>·</span>}
              {selectedItem.email && <span className="truncate">{selectedItem.email}</span>}
            </div>
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(e) => e.key === 'Enter' && handleClear(e)}
            className="p-1 rounded-md hover:bg-red-500/20 text-[var(--text-tertiary)] hover:text-red-500 transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </div>
        </button>
      ) : (
        /* Search input */
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            disabled={disabled}
            onChange={(e) => {
              setSearch(e.target.value)
              if (!open) setOpen(true)
            }}
            onFocus={() => { setOpen(true); loadData() }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            className={cn(
              'w-full h-10 pl-9 pr-3 rounded-lg border text-sm outline-none transition-colors',
              'glass-bg border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
              'focus:border-[var(--brand-primary)]/60 focus:ring-2 focus:ring-[var(--brand-primary)]/20',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); inputRef.current?.focus() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Results panel */}
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-[var(--glass-border)] bg-popover text-popover-foreground shadow-xl overflow-hidden">
          {isLoading ? (
            <div className="py-8 flex items-center justify-center gap-2 text-sm text-[var(--text-tertiary)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading contacts...
            </div>
          ) : !hasResults ? (
            <div className="py-6 text-center">
              <p className="text-sm text-[var(--text-tertiary)]">
                {search ? `No results for "${search}"` : 'No contacts found'}
              </p>
            </div>
          ) : (
            <div
              ref={listRef}
              className="max-h-[320px] overflow-y-auto overscroll-contain"
            >
              {filteredProspects.length > 0 && (
                <div>
                  <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Prospects
                  </div>
                  {filteredProspects.slice(0, 15).map(prospect => {
                    const idx = runningIdx++
                    return <ResultRow key={prospect.id} item={prospect} type="prospect" idx={idx} />
                  })}
                  {filteredProspects.length > 15 && (
                    <div className="px-3 py-1.5 text-xs text-muted-foreground text-center">
                      Showing 15 of {filteredProspects.length} — refine your search
                    </div>
                  )}
                </div>
              )}

              {filteredProspects.length > 0 && filteredClients.length > 0 && (
                <div className="mx-3 border-t border-border" />
              )}

              {filteredClients.length > 0 && (
                <div>
                  <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Contacts & Clients
                  </div>
                  {filteredClients.slice(0, 50).map(client => {
                    const idx = runningIdx++
                    return <ResultRow key={client.id} item={client} type="client" idx={idx} />
                  })}
                  {filteredClients.length > 50 && (
                    <div className="px-3 py-1.5 text-xs text-muted-foreground text-center">
                      Showing 50 of {filteredClients.length} — refine your search
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {showCreateNew && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onCreateNew?.()
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors border-t border-border text-[var(--brand-primary)] hover:bg-accent"
            >
              <UserPlus className="h-4 w-4" />
              Create new prospect
            </button>
          )}
        </div>
      )}
    </div>
  )
}
