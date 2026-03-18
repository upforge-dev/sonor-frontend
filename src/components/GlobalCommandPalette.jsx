import { useState, useEffect, useCallback, useRef } from 'react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Home,
  FileText,
  MessageSquare,
  DollarSign,
  BarChart3,
  Users,
  FolderOpen,
  Mail,
  Search,
  Zap,
  Calendar,
  Box,
  Send,
  ShoppingCart,
  Brain,
  Radio,
  Star,
  Sparkles,
  Settings,
  Loader2,
  MessageCircle,
  ArrowRight,
} from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import { echoApi } from '@/lib/signal-api'
import { useSignalTier } from '@/hooks/useSignalTier'

const AI_HISTORY_KEY = 'sonor:command-palette:ai-history'
const AI_HISTORY_MAX = 5

function loadAiHistory() {
  try {
    const raw = localStorage.getItem(AI_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAiHistory(history) {
  try {
    localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(history.slice(0, AI_HISTORY_MAX)))
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

function formatRelativeTime(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// Detect if user is on Windows
const isWindows = typeof navigator !== 'undefined' && /Win/i.test(navigator.platform)
const modKey = isWindows ? 'Ctrl' : '⌘'

// All available sections/pages in the portal
const NAVIGATION_ITEMS = [
  { id: 'dashboard', name: 'Dashboard', icon: Home, keywords: ['home', 'overview', 'main'] },
  { id: 'analytics', name: 'Analytics', icon: BarChart3, keywords: ['stats', 'metrics', 'data', 'traffic'] },
  { id: 'seo', name: 'SEO', icon: Search, keywords: ['search', 'google', 'ranking', 'keywords'] },
  { id: 'engage', name: 'Engage', icon: Zap, keywords: ['popups', 'banners', 'nudges', 'widgets'] },
  { id: 'outreach', name: 'Outreach', icon: Mail, keywords: ['email', 'campaigns', 'newsletter'] },
  { id: 'crm', name: 'CRM', icon: Users, keywords: ['contacts', 'leads', 'clients', 'prospects'] },
  { id: 'messages', name: 'Messages', icon: MessageSquare, keywords: ['chat', 'inbox', 'conversation'] },
  { id: 'files', name: 'Files', icon: FolderOpen, keywords: ['drive', 'documents', 'uploads'] },
  { id: 'sync', name: 'Sync', icon: Calendar, keywords: ['calendar', 'scheduling', 'booking'] },
  { id: 'commerce', name: 'Commerce', icon: Box, keywords: ['products', 'services', 'sales', 'shop'] },
  { id: 'proposals', name: 'Proposals', icon: Send, keywords: ['contracts', 'quotes'] },
  { id: 'billing', name: 'Billing', icon: DollarSign, keywords: ['invoices', 'payments'] },
  { id: 'forms', name: 'Forms', icon: FileText, keywords: ['intake', 'surveys'] },
  { id: 'broadcast', name: 'Broadcast', icon: Radio, keywords: ['announcements'] },
  { id: 'reputation', name: 'Reputation', icon: Star, keywords: ['reviews', 'ratings'] },
  { id: 'signal', name: 'Signal AI', icon: Sparkles, keywords: ['ai', 'echo', 'assistant', 'chat'] },
  { id: 'projects', name: 'Projects', icon: FolderOpen, keywords: ['clients', 'tenants'] },
  { id: 'team', name: 'Team', icon: Users, keywords: ['users', 'members', 'staff'] },
  { id: 'settings', name: 'Settings', icon: Settings, keywords: ['preferences', 'config'] },
]

export default function GlobalCommandPalette({ open, onOpenChange, onNavigate }) {
  const [search, setSearch] = useState('')
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiHistory, setAiHistory] = useState(loadAiHistory)
  const currentOrg = useAuthStore((state) => state.currentOrg)
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin)
  const { canUseEcho, upgradeLabel, upgradePath } = useSignalTier()
  const abortRef = useRef(null)

  const hasFeature = (featureKey) => {
    if (isSuperAdmin) return true
    return currentOrg?.features?.[featureKey] === true
  }

  // Filter items based on search and feature access
  const filteredItems = NAVIGATION_ITEMS.filter(item => {
    // Check if user has access to this feature
    const hasAccess = !['seo', 'engage', 'signal'].includes(item.id) || hasFeature(item.id)
    if (!hasAccess) return false

    // Filter by search term
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.keywords.some(k => k.includes(searchLower))
    )
  })

  // Determine if AI mode should activate:
  // query is >5 chars AND no navigation items matched
  const showAiMode = search.length > 5 && filteredItems.length === 0

  // Reset AI result when search changes
  useEffect(() => {
    setAiResult(null)
  }, [search])

  // Reset state when palette closes
  useEffect(() => {
    if (!open) {
      setSearch('')
      setAiResult(null)
      setAiLoading(false)
      if (abortRef.current) {
        abortRef.current = false
      }
    }
  }, [open])

  // Execute an AI command via Echo
  const executeAiCommand = useCallback(async (query) => {
    if (!canUseEcho || !query) return

    setAiLoading(true)
    setAiResult(null)
    abortRef.current = false

    // Determine page context from current location
    const pageContext = {
      path: window.location.pathname,
      module: window.location.pathname.split('/').filter(Boolean)[0] || 'dashboard',
    }

    try {
      const result = await echoApi.command(query, pageContext)

      // If the palette was closed while waiting, discard
      if (abortRef.current) return

      // Save to recent history
      const newHistory = [
        { query, type: result.type, timestamp: Date.now() },
        ...aiHistory.filter((h) => h.query !== query),
      ].slice(0, AI_HISTORY_MAX)
      setAiHistory(newHistory)
      saveAiHistory(newHistory)

      // Handle response types
      if (result.type === 'navigate') {
        onNavigate(result.path)
        onOpenChange(false)
        setSearch('')
      } else if (result.type === 'open_echo') {
        window.dispatchEvent(
          new CustomEvent('open-echo', {
            detail: { skill: result.skill, prompt: result.prompt },
          })
        )
        onOpenChange(false)
        setSearch('')
      } else if (result.type === 'answer') {
        setAiResult(result)
      } else {
        // Unknown type — show as answer fallback
        setAiResult({ type: 'answer', content: result.content || result.message || 'Done.' })
      }
    } catch (err) {
      if (!abortRef.current) {
        setAiResult({ type: 'answer', content: `Something went wrong: ${err.message}` })
      }
    } finally {
      if (!abortRef.current) {
        setAiLoading(false)
      }
    }
  }, [canUseEcho, aiHistory, onNavigate, onOpenChange])

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ⌘K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  const handleSelect = useCallback((itemId) => {
    onNavigate(itemId)
    onOpenChange(false)
    setSearch('')
  }, [onNavigate, onOpenChange])

  const handleCloseAiResult = useCallback(() => {
    setAiResult(null)
    setSearch('')
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="relative">
        <CommandInput
          placeholder={`Search portal... (${modKey}+K)`}
          value={search}
          onValueChange={setSearch}
        />
        {showAiMode && canUseEcho && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
            <Sparkles className="h-3 w-3" />
            AI
          </span>
        )}
      </div>

      {/* Inline AI answer card */}
      {aiResult?.type === 'answer' && (
        <div className="border-b bg-muted/40 px-4 py-3">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {aiResult.content}
              </p>
              {aiResult.action && (
                <button
                  onClick={() => {
                    if (aiResult.action.path) {
                      onNavigate(aiResult.action.path)
                      onOpenChange(false)
                      setSearch('')
                    }
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                >
                  {aiResult.action.label || 'Go'}
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
            <button
              onClick={handleCloseAiResult}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      <CommandList>
        {/* AI loading state */}
        {aiLoading && (
          <div className="flex items-center gap-2 px-4 py-6 justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
            <span>Asking Echo...</span>
          </div>
        )}

        {/* AI mode: "Ask Echo" option when no nav matches and not already loading/answered */}
        {showAiMode && !aiLoading && !aiResult && (
          <>
            {canUseEcho ? (
              <CommandGroup heading="Ask Echo">
                <CommandItem
                  value={`ask-echo-${search}`}
                  onSelect={() => executeAiCommand(search)}
                  className="flex items-center gap-2 px-4 py-2.5"
                >
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  <span className="flex-1 truncate">
                    Ask Echo: <span className="font-medium">&ldquo;{search}&rdquo;</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </CommandItem>
              </CommandGroup>
            ) : (
              <CommandGroup heading="AI Assistant">
                <CommandItem
                  value="upgrade-for-echo"
                  onSelect={() => {
                    onNavigate(upgradePath)
                    onOpenChange(false)
                    setSearch('')
                  }}
                  className="flex items-center gap-2 px-4 py-2.5"
                >
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-muted-foreground">
                    {upgradeLabel} to use Echo AI commands
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </CommandItem>
              </CommandGroup>
            )}
          </>
        )}

        {/* Standard "no results" — only when AI mode is also not showing */}
        {!showAiMode && !aiLoading && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}

        {/* Hint when AI mode is active but user hasn't pressed enter yet */}
        {showAiMode && !aiLoading && !aiResult && canUseEcho && (
          <div className="px-4 py-2 text-center text-xs text-muted-foreground">
            Type naturally to ask Echo
          </div>
        )}

        {/* Navigation results */}
        {filteredItems.length > 0 && (
          <CommandGroup heading="Navigation">
            {filteredItems.map((item) => {
              const Icon = item.icon
              return (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => handleSelect(item.id)}
                  className="flex items-center gap-2 px-4 py-2.5"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{item.name}</span>
                  {item.keywords.length > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {item.keywords[0]}
                    </span>
                  )}
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        {/* Recent AI commands */}
        {!search && aiHistory.length > 0 && canUseEcho && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent Echo Commands">
              {aiHistory.map((entry) => (
                <CommandItem
                  key={`ai-history-${entry.timestamp}`}
                  value={`ai-history-${entry.query}`}
                  onSelect={() => {
                    setSearch(entry.query)
                    executeAiCommand(entry.query)
                  }}
                  className="flex items-center gap-2 px-4 py-2"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm">{entry.query}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatRelativeTime(entry.timestamp)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
      <div className="border-t px-3 py-2 text-center text-xs text-muted-foreground">
        Press {modKey}K from anywhere to open search
      </div>
    </CommandDialog>
  )
}
