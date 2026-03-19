// src/pages/commerce/CommerceDashboard.jsx
// Unified Commerce Dashboard - Liquid Glass design with sidebar and multiple views
// Dark theme compatible, renders as rounded tile inside MainLayout
// MIGRATED TO REACT QUERY HOOKS - Jan 29, 2026

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import useAuthStore from '@/lib/auth-store'
import { supabase } from '@/lib/supabase'
import { useBrandColors } from '@/hooks/useBrandColors'
import { useCommerceSettings, useCommerceDashboard, getCommerceDashboard, useCommerceOfferings, useCommerceOffering, commerceKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import portalApi, { commerceApi, proposalsApi } from '@/lib/portal-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

// Extracted view components
import { SalesOverviewView, InvoicesView, TransactionsView, InvoiceSkeleton, INVOICE_STATUS_CONFIG, InvoiceDetailPanel } from './components/SalesViews'
import { ContractsView } from './components/ContractsView'
import { CustomersView } from './components/CustomersView'
import { InvoiceCreateDialog } from './components/InvoiceCreateDialog'
import { InvoiceEditDialog } from './components/InvoiceEditDialog'
import ProposalAIEditorPanel from '@/components/proposals/ProposalAIEditorPanel'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useDeleteInvoice, useVoidInvoice } from '@/lib/hooks/use-billing'
import { HighlightsView, ProductsView, ServicesView, EventsView } from './components/CommerceViews'
import { STATUS_CONFIG, PRICE_TYPE_CONFIG, SIDEBAR_SECTIONS } from './components/CommerceConstants'
import { ActivityItem, StatsCard } from './components/CommerceStats'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Package,
  Plus,
  Search,
  TrendingUp,
  DollarSign,
  FileText,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  List,
  RefreshCw,
  ExternalLink,
  Store,
  CreditCard,
  Settings,
  Zap,
  Sparkles,
  Calendar,
  Clock,
  Users,
  Receipt,
  BarChart3,
  Wallet,
  ShoppingBag,
  CloudOff,
  Tag,
  Download,
  ShoppingCart,
  Cloud,
  Send,
  AlertTriangle,
  Folder,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import CreateWithSignalDialog from '@/components/commerce/CreateWithSignalDialog'
import ImportFromSignalDialog from '@/components/commerce/ImportFromSignalDialog'
import CommerceSettings from '@/components/commerce/CommerceSettings'
import CategoriesManagement from '@/components/commerce/CategoriesManagement'
import InventoryManagement from '@/components/commerce/InventoryManagement'
import DiscountCodesManagement from '@/components/commerce/DiscountCodesManagement'
import ShopifySetupDialog from '@/components/commerce/ShopifySetupDialog'
import StripeSetupDialog from '@/components/commerce/StripeSetupDialog'
import SquareSetupDialog from '@/components/commerce/SquareSetupDialog'
import OfferingCreate from './OfferingCreate'
import ProjectIntegrationsDialog from '@/components/projects/ProjectIntegrationsDialog'
import OfferingDetail from './OfferingDetail'
import OfferingEdit from './OfferingEdit'
import { ModuleLayout } from '@/components/ModuleLayout'
import { MODULE_ICONS } from '@/lib/module-icons'
import usePageContextStore from '@/lib/page-context-store'
import { cn } from '@/lib/utils'
import { format, subDays } from 'date-fns'
import { toast } from '@/lib/toast'
import { SignalSuggestsPanel } from '@/components/ai/SignalSuggestsPanel'

async function getOfferings(projectId, params) {
  const res = await commerceApi.getOfferings(projectId, params)
  return res?.data ?? res ?? []
}

export default function CommerceDashboard({ onNavigate }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { currentProject, currentOrg } = useAuthStore()
  const brandColors = useBrandColors()
  const projectId = currentProject?.id
  const { data: settings, refetch: fetchSettings } = useCommerceSettings(projectId)
  
  // Detect if this is an agency org
  // Agencies use Billing API for invoices + system emails
  // Other orgs use Commerce invoices API + Outreach emails
  const isAgencyOrg = currentOrg?.org_type === 'agency'
  
  // Get enabled offering types from commerce settings
  const enabledTypes = settings?.enabled_types || []
  const isProductsEnabled = enabledTypes.includes('product')
  const isServicesEnabled = enabledTypes.includes('service')
  const isEventsEnabled = enabledTypes.includes('event')
  
  // Replace query params with React state for clean URLs
  const [currentView, setCurrentView] = useState('highlights')
  const [currentFilter, setCurrentFilter] = useState('all')
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [salesTab, setSalesTab] = useState('overview')
  const [customersTab, setCustomersTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [offeringId, setOfferingId] = useState(null)
  const [returnView, setReturnView] = useState('events')
  const [offeringMode, setOfferingMode] = useState('view')

  const { data: currentOffering } = useCommerceOffering(offeringId)
  
  const [products, setProducts] = useState([])
  const [services, setServices] = useState([])
  const [events, setEvents] = useState([])
  const [invoices, setInvoices] = useState([])
  const [transactions, setTransactions] = useState([])
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isServicesLoading, setIsServicesLoading] = useState(true)
  const [isEventsLoading, setIsEventsLoading] = useState(true)
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(true)
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [servicesError, setServicesError] = useState(null)
  const [eventsError, setEventsError] = useState(null)
  const [invoicesError, setInvoicesError] = useState(null)
  const [transactionsError, setTransactionsError] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [productsOpen, setProductsOpen] = useState(currentView === 'products')
  const [servicesOpen, setServicesOpen] = useState(currentView === 'services')
  const [eventsOpen, setEventsOpen] = useState(currentView === 'events')
  const [salesOpen, setSalesOpen] = useState(currentView === 'sales')
  const [customersOpen, setCustomersOpen] = useState(currentView === 'customers')
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false)
  const [isSignalDialogOpen, setIsSignalDialogOpen] = useState(false)
  const [signalCreating, setSignalCreating] = useState(false) // Embedded Signal create mode
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false) // Import from Signal dialog
  const [isCommerceSettingsOpen, setIsCommerceSettingsOpen] = useState(false)
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false)
  const [isInventoryOpen, setIsInventoryOpen] = useState(false)
  const [isDiscountsOpen, setIsDiscountsOpen] = useState(false)
  const [isIntegrationsDialogOpen, setIsIntegrationsDialogOpen] = useState(false)
  const [isShopifyDialogOpen, setIsShopifyDialogOpen] = useState(false)
  const [isStripeDialogOpen, setIsStripeDialogOpen] = useState(false)
  const [isSquareDialogOpen, setIsSquareDialogOpen] = useState(false)
  const [isCreatingContract, setIsCreatingContract] = useState(false)
  const [categories, setCategories] = useState([])
  // Create mode state - which offering type is being created (null = not creating)
  const [creatingType, setCreatingType] = useState(null)
  // Invoice detail panel actions (edit, delete, void)
  const [editingInvoiceId, setEditingInvoiceId] = useState(null)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [pendingVoidId, setPendingVoidId] = useState(null)
  const [aiEditingContract, setAiEditingContract] = useState(null)
  const [contractHasUnsavedChanges, setContractHasUnsavedChanges] = useState(false)
  const [isSavingContract, setIsSavingContract] = useState(false)
  const contractsViewRef = useRef(null)

  const deleteInvoiceMutation = useDeleteInvoice()
  const voidInvoiceMutation = useVoidInvoice()
  
  // Integration status derived from settings
  const integrations = useMemo(() => {
    const s = settings || {}
    return {
      shopify: {
        connected: !!s.shopify_store_url,
        storeUrl: s.shopify_store_url,
        lastSync: s.shopify_last_sync,
      },
      stripe: {
        connected: !!s.stripe_account_id,
        accountId: s.stripe_account_id,
      },
      square: {
        connected: !!s.square_merchant_id,
        merchantId: s.square_merchant_id,
      },
    }
  }, [settings])
  
  // Check if in Shopify mode (products come from Shopify)
  const isShopifyMode = integrations.shopify.connected
  // Check if any payment processor is connected for manual products
  const hasPaymentProcessor = integrations.stripe.connected || integrations.square.connected
  // Check if this project has Signal AI enabled
  const hasSignal = currentProject?.features?.signal === true || currentProject?.features?.includes?.('signal')
  // Is operating in fallback mode (no commerce tables)
  const isFallbackMode = stats?._fallbackMode

  // Sync URL params (view, tab, invoiceCreate, invoiceId) to state on mount and when params change
  useEffect(() => {
    const view = searchParams.get('view')
    const tab = searchParams.get('tab')
    const invoiceCreate = searchParams.get('invoiceCreate')
    const invoiceIdParam = searchParams.get('invoiceId')
    if (view) {
      setCurrentView(view)
      if (view === 'customers' && tab) setCustomersTab(tab)
      if (view === 'sales' && tab) setSalesTab(tab)
    }
    if (invoiceCreate === '1') {
      setCurrentView('sales')
      setSalesTab('invoices')
      setIsInvoiceDialogOpen(true)
    }
    if (invoiceIdParam) {
      setCurrentView('sales')
      setSalesTab('invoices')
    }
  }, [searchParams])

  const selectedInvoiceId = searchParams.get('invoiceId') || null
  const onClearInvoice = () => {
    navigate('/commerce?view=sales&tab=invoices', { replace: true })
  }

  const handleInvoiceEdit = () => setEditingInvoiceId(selectedInvoiceId)
  const handleInvoiceEditSuccess = () => {
    loadInvoices?.()
    setEditingInvoiceId(null)
  }
  const handleInvoiceDeleteRequest = () => setPendingDeleteId(selectedInvoiceId)
  const handleInvoiceDeleteConfirm = () => {
    if (!pendingDeleteId) return
    deleteInvoiceMutation.mutate(pendingDeleteId, {
      onSuccess: () => {
        toast.success('Invoice deleted')
        onClearInvoice()
        loadInvoices?.()
      },
      onError: (err) => toast.error(err?.message || 'Failed to delete invoice'),
      onSettled: () => setPendingDeleteId(null),
    })
  }
  const handleInvoiceVoidRequest = () => setPendingVoidId(selectedInvoiceId)

  const handleSaveContract = async (updatedContractOrUndefined) => {
    const updatedContract = updatedContractOrUndefined ?? aiEditingContract
    if (!updatedContract?.id || !projectId) return
    setIsSavingContract(true)
    try {
      const isProposal = updatedContract._isProposal || currentOrg?.org_type === 'agency'
      if (isProposal) {
        await proposalsApi.update(updatedContract.id, {
          mdx_content: updatedContract.mdxContent || updatedContract.mdx_content,
          total_amount: updatedContract.totalAmount || updatedContract.total_amount,
          payment_terms: updatedContract.paymentTerms || updatedContract.payment_terms,
          timeline: updatedContract.timeline,
        })
      } else {
        await commerceApi.updateContract(projectId, updatedContract.id, {
          mdx_content: updatedContract.mdxContent || updatedContract.mdx_content,
          total_amount: updatedContract.totalAmount || updatedContract.total_amount,
          payment_terms: updatedContract.paymentTerms || updatedContract.payment_terms,
          timeline: updatedContract.timeline,
        })
      }
      setContractHasUnsavedChanges(false)
      contractsViewRef.current?.updateContractInList?.({ ...updatedContract, _isProposal: updatedContract._isProposal })
      setAiEditingContract(prev => prev?.id === updatedContract.id ? { ...updatedContract, _isProposal: prev._isProposal } : prev)
      toast.success('Changes saved successfully')
    } catch (err) {
      console.error('Save contract error:', err)
      toast.error('Failed to save changes')
    } finally {
      setIsSavingContract(false)
    }
  }

  const handleInvoiceVoidConfirm = () => {
    if (!pendingVoidId) return
    voidInvoiceMutation.mutate(pendingVoidId, {
      onSuccess: () => {
        toast.success('Invoice voided')
        onClearInvoice()
        loadInvoices?.()
      },
      onError: (err) => toast.error(err?.message || 'Failed to void invoice'),
      onSettled: () => setPendingVoidId(null),
    })
  }

  // Hide messenger widget when editing a proposal (avoids overlap with AI Editor sidebar)
  useEffect(() => {
    usePageContextStore.getState().setHideMessengerWidget(!!aiEditingContract)
    return () => usePageContextStore.getState().setHideMessengerWidget(false)
  }, [aiEditingContract])

  // Redirect to highlights if view is 'offering' but no offeringId
  useEffect(() => {
    if (currentView === 'offering' && !offeringId) {
      setCurrentView('highlights')
      setOfferingMode('view')
    }
  }, [currentView, offeringId])

  // Load products
  useEffect(() => {
    if (currentView === 'products' || currentView === 'highlights') {
      loadProducts()
    }
  }, [projectId, currentFilter, selectedCategoryId, searchQuery, currentView])

  // Load services
  useEffect(() => {
    if (currentView === 'services' || currentView === 'highlights') {
      loadServices()
    }
  }, [projectId, currentFilter, selectedCategoryId, searchQuery, currentView])

  // Load events
  useEffect(() => {
    if (currentView === 'events' || currentView === 'highlights') {
      loadEvents()
    }
  }, [projectId, currentFilter, selectedCategoryId, searchQuery, currentView])

  // Load sales data (invoices and transactions)
  useEffect(() => {
    if (currentView === 'sales' || currentView === 'highlights') {
      loadInvoices()
      loadTransactions()
    }
  }, [projectId, currentView, salesTab])

  // Load stats and settings on initial mount
  useEffect(() => {
    if (projectId) {
      loadStats()
      loadCategories()
      fetchSettings().catch(err => {
        console.error('Failed to load commerce settings:', err)
      })
    }
  }, [projectId, fetchSettings])

  async function loadCategories() {
    if (!projectId) return
    try {
      const response = await portalApi.get(`/commerce/categories/${projectId}`)
      setCategories(response.data || [])
    } catch (err) {
      console.error('Failed to load categories:', err)
    }
  }

  async function loadProducts() {
    if (!projectId) return
    setIsLoading(true)
    setError(null)
    
    try {
      const filters = { type: 'product' }
      if (currentView === 'products' && currentFilter !== 'all') {
        filters.status = currentFilter
      }
      if (selectedCategoryId) {
        filters.category_id = selectedCategoryId
      }
      if (searchQuery) {
        filters.search = searchQuery
      }
      
      const data = await getOfferings(projectId, filters)
      setProducts(data || [])
    } catch (err) {
      console.error('Failed to load products:', err)
      setError('Failed to load products')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadServices() {
    if (!projectId) return
    setIsServicesLoading(true)
    setServicesError(null)
    
    try {
      const filters = { type: 'service' }
      if (currentView === 'services' && currentFilter !== 'all') {
        filters.status = currentFilter
      }
      if (selectedCategoryId) {
        filters.category_id = selectedCategoryId
      }
      if (searchQuery) {
        filters.search = searchQuery
      }
      
      const data = await getOfferings(projectId, filters)
      setServices(data || [])
    } catch (err) {
      console.error('Failed to load services:', err)
      setServicesError('Failed to load services')
    } finally {
      setIsServicesLoading(false)
    }
  }

  async function loadEvents() {
    if (!projectId) return
    setIsEventsLoading(true)
    setEventsError(null)
    
    try {
      const filters = { type: 'event' }
      // For events, only send status filter for 'draft' — 'active'/'archived' are handled
      // client-side via date-aware logic so past events with status='active' still show under "Past"
      if (currentView === 'events' && currentFilter === 'draft') {
        filters.status = 'draft'
      }
      if (selectedCategoryId) {
        filters.category_id = selectedCategoryId
      }
      if (searchQuery) {
        filters.search = searchQuery
      }
      
      const data = await getOfferings(projectId, filters)
      setEvents(data || [])
    } catch (err) {
      console.error('Failed to load events:', err)
      setEventsError('Failed to load events')
    } finally {
      setIsEventsLoading(false)
    }
  }

  async function loadStats() {
    try {
      const data = await getCommerceDashboard(projectId)
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  async function loadInvoices() {
    if (!projectId) return
    setIsInvoicesLoading(true)
    setInvoicesError(null)
    
    try {
      if (isAgencyOrg) {
        // Sonor: Use Billing API (org-level invoices)
        const { data } = await portalApi.get('/billing/invoices', {
          params: { project_id: projectId, limit: 10 }
        })
        // API returns { invoices: [], total, page, limit, totalPages }
        const invoiceData = data?.invoices || data || []
        setInvoices(invoiceData.map(inv => ({ ...inv, _isBillingInvoice: true })))
      } else {
        // Other orgs: Use Commerce invoices API (project-level invoices)
        const { commerceApi } = await import('@/lib/portal-api')
        const res = await commerceApi.getInvoices(projectId, { params: { limit: 50 } })
        const invoiceData = res?.data ?? res ?? []
        setInvoices(Array.isArray(invoiceData) ? invoiceData : [])
      }
    } catch (err) {
      console.error('Failed to load invoices:', err)
      setInvoicesError(err?.message || 'Failed to load invoices')
      setInvoices([])
    } finally {
      setIsInvoicesLoading(false)
    }
  }

  async function loadTransactions() {
    if (!projectId) return
    setIsTransactionsLoading(true)
    setTransactionsError(null)
    
    try {
      const { commerceApi } = await import('@/lib/portal-api')
      const response = await commerceApi.getSales(projectId, { params: { limit: 10 } })
      const salesData = response?.data?.sales ?? response?.data?.data ?? response?.data ?? []
      setTransactions(Array.isArray(salesData) ? salesData : [])
    } catch (err) {
      console.error('Failed to load transactions:', err)
      setTransactions([])
      const msg = err?.message || ''
      setTransactionsError(
        msg.includes('does not exist')
          ? 'Commerce sales table not set up yet'
          : msg || 'Failed to load transactions'
      )
    } finally {
      setIsTransactionsLoading(false)
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true)
    try {
      if (isShopifyMode && projectId) {
        try {
          await commerceApi.syncShopify(projectId)
        } catch (err) {
          toast.error(err?.response?.data || err?.message || 'Shopify sync failed')
        }
      }
      await Promise.all([loadProducts(), loadServices(), loadEvents(), loadInvoices(), loadTransactions(), loadStats()])
    } finally {
      setIsRefreshing(false)
    }
  }

  async function handleSyncShopify() {
    if (!projectId) return
    setIsRefreshing(true)
    try {
      const res = await commerceApi.syncShopify(projectId)
      await loadProducts()
      const count = res?.data?.productsSynced ?? res?.productsSynced
      toast.success(count != null ? `Synced ${count} products from Shopify` : 'Shopify sync completed')
    } catch (err) {
      toast.error(err?.response?.data || err?.message || 'Shopify sync failed')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Count products by status
  const statusCounts = useMemo(() => {
    const counts = { all: products.length, active: 0, draft: 0, archived: 0 }
    products.forEach(p => {
      if (counts[p.status] !== undefined) {
        counts[p.status]++
      }
    })
    return counts
  }, [products])

  // Count services by status
  const serviceCounts = useMemo(() => {
    const counts = { all: services.length, active: 0, draft: 0, archived: 0 }
    services.forEach(s => {
      if (counts[s.status] !== undefined) {
        counts[s.status]++
      }
    })
    return counts
  }, [services])

  // Determine if an event is "past" based on its latest schedule date
  const isEventPast = useCallback((event) => {
    const startsAt = event.next_schedule?.starts_at ?? event.schedules?.[0]?.starts_at ?? event.starts_at
    if (!startsAt) return false
    return new Date(startsAt) < new Date()
  }, [])

  // Count events by date-aware categories
  const eventCounts = useMemo(() => {
    const counts = { all: events.length, active: 0, draft: 0, archived: 0 }
    events.forEach(e => {
      if (e.status === 'draft') {
        counts.draft++
      } else if (isEventPast(e)) {
        counts.archived++ // "Past" events count
      } else {
        counts.active++ // "Upcoming" events count
      }
    })
    return counts
  }, [events, isEventPast])

  // Get the event's schedule date for sorting
  const getEventDate = useCallback((event) => {
    const startsAt = event.next_schedule?.starts_at ?? event.schedules?.[0]?.starts_at ?? event.starts_at
    return startsAt ? new Date(startsAt) : new Date(0)
  }, [])

  // Date-aware filtered events for the current sidebar selection
  const filteredEvents = useMemo(() => {
    if (currentView !== 'events') return events
    switch (currentFilter) {
      case 'active': // "Upcoming" — soonest first
        return events
          .filter(e => e.status !== 'draft' && !isEventPast(e))
          .sort((a, b) => getEventDate(a) - getEventDate(b))
      case 'archived': { // "Past" — most recent first
        return events
          .filter(e => e.status !== 'draft' && isEventPast(e))
          .sort((a, b) => getEventDate(b) - getEventDate(a))
      }
      case 'draft':
        return events.filter(e => e.status === 'draft')
      default: // 'all'
        return events
    }
  }, [events, currentView, currentFilter, isEventPast, getEventDate])

  // Count invoices by status (Billing API uses due_at, status: sent/viewed = unpaid)
  const invoiceCounts = useMemo(() => {
    const invoiceList = Array.isArray(invoices) ? invoices : []
    const counts = { all: invoiceList.length, pending: 0, paid: 0, overdue: 0, cancelled: 0 }
    const dueDate = (inv) => inv?.due_at || inv?.due_date
    invoiceList.forEach(inv => {
      const isUnpaid = ['pending', 'sent', 'viewed', 'draft'].includes(inv.status)
      if (isUnpaid && dueDate(inv) && new Date(dueDate(inv)) < new Date()) {
        counts.overdue++
      } else if (inv.status === 'paid') {
        counts.paid++
      } else if (inv.status === 'cancelled' || inv.status === 'refunded') {
        counts.cancelled++
      } else if (isUnpaid) {
        counts.pending++
      }
    })
    return counts
  }, [invoices])

  // Count low stock products
  const lowStockCount = useMemo(() => {
    return products.filter(p => 
      p.track_inventory && p.inventory_quantity <= 5 && p.inventory_quantity > 0
    ).length
  }, [products])

  // Update view
  function setView(view) {
    setCurrentView(view)
    if (view === 'highlights') {
      setCurrentFilter('all')
      setOfferingMode('view')
    } else {
      setOfferingMode('view') // Reset mode when changing views
    }
    setCreatingType(null) // Also reset create mode when changing views
  }

  function openOffering(id) {
    if (!id) return
    setReturnView(currentView)
    setCurrentView('offering')
    setOfferingId(id)
    setOfferingMode('view')
  }

  function openOfferingEdit(id) {
    if (!id) return
    setReturnView(currentView)
    setCurrentView('offering')
    setOfferingId(id)
    setOfferingMode('edit')
  }

  function closeOfferingEdit(id) {
    if (id) {
      setOfferingId(id)
    }
    setCurrentView('offering')
    setOfferingMode('view')
  }

  function closeOffering() {
    // Go back to the list that matches this offering type (product → products, etc.)
    const type = currentOffering?.type
    const listView = type === 'product' ? 'products' : type === 'service' ? 'services' : (type === 'event' || type === 'class') ? 'events' : null
    setCurrentView(listView || returnView || 'highlights')
    setOfferingId(null)
    setReturnView('events')
    setOfferingMode('view')
  }

  async function handleDuplicateEvent(event) {
    if (!projectId || !event) return
    try {
      const duplicateData = {
        type: event.type || 'event',
        name: `${event.name || event.title} (Copy)`,
        slug: `${event.slug || 'event'}-copy-${Date.now()}`,
        description: event.description,
        short_description: event.short_description,
        price: event.price,
        price_type: event.price_type,
        compare_at_price: event.compare_at_price,
        currency: event.currency,
        duration_minutes: event.duration_minutes,
        capacity: event.capacity,
        category_id: event.category_id,
        tags: event.tags,
        features: event.features,
        deposit_settings: event.deposit_settings,
        location: event.location,
        is_virtual: event.is_virtual,
        status: 'draft',
      }
      const response = await portalApi.post(`/commerce/offerings/${projectId}`, duplicateData)
      toast.success('Event duplicated as draft')
      loadEvents()
      openOffering(response.data?.id || response.id)
    } catch (err) {
      console.error('Failed to duplicate event:', err)
      toast.error('Failed to duplicate event')
    }
  }

  // Set create mode for a specific offering type (uses local state, not URL)
  function startCreating(type) {
    setCreatingType(type)
  }

  // Exit create mode - go back to list
  function stopCreating() {
    setCreatingType(null)
  }

  // Handle successful offering creation
  function handleOfferingCreated(offering) {
    stopCreating()
    // Reload the appropriate list
    if (offering.type === 'event') {
      loadEvents()
    } else if (offering.type === 'service') {
      loadServices()
    } else {
      loadProducts()
    }
  }

  // Update filter (products)
  function setProductFilter(status) {
    setCurrentView('products')
    setCurrentFilter(status)
    setProductsOpen(true)
  }

  // Update filter (services)
  function setServiceFilter(status) {
    setCurrentView('services')
    setCurrentFilter(status)
    setServicesOpen(true)
  }

  // Update filter (events)
  function setEventFilter(status) {
    setCurrentView('events')
    setCurrentFilter(status)
    setEventsOpen(true)
  }

  // Update sales tab
  function changeSalesTab(tab) {
    setCurrentView('sales')
    setSalesTab(tab)
    setSalesOpen(true)
  }

  // Update customers tab
  function changeCustomersTab(tab) {
    setCurrentView('customers')
    setCustomersTab(tab)
    setCustomersOpen(true)
  }

  function handleSearch(value) {
    setSearchQuery(value || '')
  }

  return (
    <TooltipProvider>
      <ModuleLayout
        leftSidebar={
          <ScrollArea className="h-full py-4">
          
          {/* Navigation Items */}
          <nav className="space-y-1 px-2">
            {/* Highlights Tab */}
            <button
              type="button"
              data-tour="commerce-analytics"
              onClick={() => setView('highlights')}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                currentView === 'highlights'
                  ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium"
                  : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
              )}
            >
              <Sparkles className={cn("h-4 w-4", currentView === 'highlights' && "text-[var(--brand-primary)]")} />
              Highlights
            </button>

            {/* Products Dropdown - Only show if products enabled */}
            {isProductsEnabled && (
            <Collapsible open={productsOpen} onOpenChange={setProductsOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  data-tour="commerce-products"
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200",
                    currentView === 'products'
                      ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Package className={cn("h-4 w-4", currentView === 'products' && "text-[var(--brand-primary)]")} />
                    Products
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-tertiary)]">{statusCounts.all}</span>
                    <ChevronDown className={cn(
                      "h-3 w-3 text-[var(--text-tertiary)] transition-transform duration-200",
                      productsOpen && "rotate-180"
                    )} />
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
                {SIDEBAR_SECTIONS.products.items.map((item) => {
                  const isActive = currentView === 'products' && (
                    currentFilter === item.id || 
                    (item.id === 'all' && currentFilter === 'all')
                  )
                  const count = statusCounts[item.id] || 0

                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setProductFilter(item.id === 'all' ? 'all' : item.filter.status)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                        isActive 
                          ? "text-[var(--brand-primary)] font-medium" 
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {item.label}
                      <span className="text-xs text-[var(--text-tertiary)]">{count}</span>
                    </button>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>
            )}

            {/* Services Dropdown - Only show if services enabled */}
            {isServicesEnabled && (
            <Collapsible open={servicesOpen} onOpenChange={setServicesOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200",
                    currentView === 'services'
                      ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium" 
                      : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Zap className={cn("h-4 w-4", currentView === 'services' && "text-[var(--brand-primary)]")} />
                    Services
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-tertiary)]">{serviceCounts.all}</span>
                    <ChevronDown className={cn(
                      "h-3 w-3 text-[var(--text-tertiary)] transition-transform duration-200",
                      servicesOpen && "rotate-180"
                    )} />
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
                {SIDEBAR_SECTIONS.services.items.map((item) => {
                  const isActive = currentView === 'services' && (
                    currentFilter === item.id || 
                    (item.id === 'all' && currentFilter === 'all')
                  )
                  const count = serviceCounts[item.id] || 0

                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setServiceFilter(item.id === 'all' ? 'all' : item.filter.status)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                        isActive 
                          ? "text-[var(--brand-primary)] font-medium" 
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {item.label}
                      <span className="text-xs text-[var(--text-tertiary)]">{count}</span>
                    </button>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>
            )}

            {/* Events Dropdown - Only show if events enabled */}
            {isEventsEnabled && (
            <Collapsible open={eventsOpen} onOpenChange={setEventsOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200",
                    currentView === 'events'
                      ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium" 
                      : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className={cn("h-4 w-4", currentView === 'events' && "text-[var(--brand-primary)]")} />
                    Events
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-tertiary)]">{eventCounts.all}</span>
                    <ChevronDown className={cn(
                      "h-3 w-3 text-[var(--text-tertiary)] transition-transform duration-200",
                      eventsOpen && "rotate-180"
                    )} />
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
                {SIDEBAR_SECTIONS.events.items.map((item) => {
                  const isActive = currentView === 'events' && (
                    currentFilter === item.id || 
                    (item.id === 'all' && currentFilter === 'all')
                  )
                  const count = eventCounts[item.id] || 0

                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setEventFilter(item.id === 'all' ? 'all' : item.filter.status)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                        isActive 
                          ? "text-[var(--brand-primary)] font-medium" 
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {item.label}
                      <span className="text-xs text-[var(--text-tertiary)]">{count}</span>
                    </button>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>
            )}

            {/* Sales Dropdown */}
            <Collapsible open={salesOpen} onOpenChange={setSalesOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  data-tour="commerce-orders"
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200",
                    currentView === 'sales'
                      ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Wallet className={cn("h-4 w-4", currentView === 'sales' && "text-[var(--brand-primary)]")} />
                    Sales
                  </div>
                  <div className="flex items-center gap-2">
                    {invoiceCounts.pending > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">{invoiceCounts.pending}</span>
                    )}
                    <ChevronDown className={cn(
                      "h-3 w-3 text-[var(--text-tertiary)] transition-transform duration-200",
                      salesOpen && "rotate-180"
                    )} />
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
                {SIDEBAR_SECTIONS.sales.items
                  .filter(item => {
                    // Hide contracts and invoices if services are not enabled
                    if (!isServicesEnabled && (item.id === 'contracts' || item.id === 'invoices')) {
                      return false
                    }
                    return true
                  })
                  .map((item) => {
                  const isActive = currentView === 'sales' && salesTab === item.id
                  const Icon = item.icon

                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => changeSalesTab(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                        isActive 
                          ? "text-[var(--brand-primary)] font-medium" 
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </button>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>

            {/* Customers Dropdown */}
            <Collapsible open={customersOpen} onOpenChange={setCustomersOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  data-tour="commerce-checkout"
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200",
                    currentView === 'customers'
                      ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Users className={cn("h-4 w-4", currentView === 'customers' && "text-[var(--brand-primary)]")} />
                    Customers
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronDown className={cn(
                      "h-3 w-3 text-[var(--text-tertiary)] transition-transform duration-200",
                      customersOpen && "rotate-180"
                    )} />
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
                {SIDEBAR_SECTIONS.customers.items
                  .filter(item => {
                    // If only one offering type is enabled, hide the entire "BY PURCHASE TYPE" section
                    if (enabledTypes.length === 1) {
                      // Hide the divider and all purchase type filters
                      if (item.id === 'divider-context' || 
                          item.id === 'product-buyers' || 
                          item.id === 'service-clients' || 
                          item.id === 'event-attendees') {
                        return false
                      }
                    } else {
                      // Multiple types enabled - show only enabled purchase type filters
                      if (item.id === 'product-buyers' && !isProductsEnabled) return false
                      if (item.id === 'service-clients' && !isServicesEnabled) return false
                      if (item.id === 'event-attendees' && !isEventsEnabled) return false
                    }
                    return true
                  })
                  .map((item) => {
                  // Handle dividers
                  if (item.divider) {
                    return (
                      <div key={item.id} className="pt-2 pb-1 px-3">
                        <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                          {item.label}
                        </span>
                      </div>
                    )
                  }

                  const isActive = currentView === 'customers' && customersTab === item.id
                  const Icon = item.icon

                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => changeCustomersTab(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                        isActive 
                          ? "text-[var(--brand-primary)] font-medium" 
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </button>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>
          </nav>

          {/* Low Stock Alert */}
          {lowStockCount > 0 && (
            <div className="mt-6 px-2">
              <button
                type="button"
                onClick={() => setProductFilter('all')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Low Stock
                </div>
                <Badge className="bg-amber-500/90 text-white border-none text-xs">
                  {lowStockCount}
                </Badge>
              </button>
            </div>
          )}

          {/* Categories Section */}
          <div className="mt-6 px-2">
            <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
              Categories
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 hover:bg-[var(--glass-bg-hover)]"
                onClick={() => setIsCategoriesOpen(true)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {categories.length === 0 ? (
              <button
                type="button"
                onClick={() => setIsCategoriesOpen(true)}
                className="w-full px-3 py-2 text-sm text-[var(--text-tertiary)] italic hover:text-[var(--text-secondary)] text-left transition-colors"
              >
                No categories yet
              </button>
            ) : (
              <div className="space-y-0.5">
                {categories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(null)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                      !selectedCategoryId
                        ? "text-[var(--brand-primary)] bg-[var(--glass-bg-hover)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]"
                    )}
                  >
                    <Folder className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                    <span className="truncate">All categories</span>
                  </button>
                )}
                {categories.slice(0, 5).map(category => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(selectedCategoryId === category.id ? null : category.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                      selectedCategoryId === category.id
                        ? "text-[var(--brand-primary)] bg-[var(--glass-bg-hover)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]"
                    )}
                  >
                    <Folder className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                    <span className="truncate">{category.name}</span>
                  </button>
                ))}
                {categories.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setIsCategoriesOpen(true)}
                    className="w-full px-3 py-1.5 text-sm text-[var(--brand-primary)] hover:underline text-left"
                  >
                    +{categories.length - 5} more...
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions - Only show if products or events enabled */}
          {(isProductsEnabled || isEventsEnabled) && (
          <div className="mt-6 px-2">
            <div className="px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
              Quick Actions
            </div>
            {/* Inventory - Only for products */}
            {isProductsEnabled && (
            <button
              type="button"
              onClick={() => setIsInventoryOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)] transition-colors"
            >
              <Package className="h-4 w-4 text-[var(--text-tertiary)]" />
              <span>Inventory</span>
            </button>
            )}
            {/* Discount Codes - For products or events */}
            {(isProductsEnabled || isEventsEnabled) && (
            <button
              type="button"
              onClick={() => setIsDiscountsOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)] transition-colors"
            >
              <Tag className="h-4 w-4 text-[var(--text-tertiary)]" />
              <span>Discount Codes</span>
            </button>
            )}
          </div>
          )}

          {/* Integrations */}
          <div className="mt-6 px-2">
            <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
              Integrations
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 hover:bg-[var(--glass-bg-hover)]"
                onClick={() => setIsCommerceSettingsOpen(true)}
              >
                <Settings className="h-3 w-3" />
              </Button>
            </div>
            
            {/* Shopify - only show when Products are enabled */}
            {isProductsEnabled && integrations.shopify.connected && (
            <div className="px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[var(--accent-green)]" />
                <span className="text-sm text-[var(--text-primary)]">Shopify</span>
                <Badge variant="outline" className="text-xs ml-auto bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-[var(--accent-green)]/20">
                  Synced
                </Badge>
              </div>
              {integrations.shopify.lastSync && (
                <p className="text-xs text-[var(--text-tertiary)] mt-1 pl-4">
                  Last sync: {formatDistanceToNow(new Date(integrations.shopify.lastSync), { addSuffix: true })}
                </p>
              )}
            </div>
            )}
            
            {/* Status indicator — payment/sync status */}
            <div className="px-3 py-3 mt-2 bg-[var(--glass-bg-inset)] rounded-lg mx-1">
              <div className="flex items-center gap-2 text-xs">
                {integrations.shopify.connected ? (
                  <>
                    <Cloud className="h-3 w-3 text-[var(--accent-green)]" />
                    <span className="text-[var(--text-secondary)]">Products sync from Shopify</span>
                  </>
                ) : integrations.stripe.connected ? (
                  <>
                    <div className="h-2 w-2 rounded-full bg-[var(--accent-green)]" />
                    <span className="text-[var(--text-secondary)]">Stripe connected</span>
                  </>
                ) : integrations.square.connected ? (
                  <>
                    <div className="h-2 w-2 rounded-full bg-[var(--accent-green)]" />
                    <span className="text-[var(--text-secondary)]">Square connected</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="h-3 w-3 text-[var(--text-tertiary)]" />
                    <span className="text-[var(--text-tertiary)]">No payment processor</span>
                  </>
                )}
              </div>
            </div>
          </div>
          </ScrollArea>
        }
        leftSidebarTitle="Commerce"
        defaultLeftSidebarOpen
        rightSidebar={
          currentView === 'sales' && salesTab === 'contracts' && aiEditingContract ? (
            <ProposalAIEditorPanel
              contract={aiEditingContract}
              projectId={projectId}
              isProposal={aiEditingContract._isProposal || currentOrg?.org_type === 'agency'}
              onSave={handleSaveContract}
              onContractChange={setAiEditingContract}
              onHasUnsavedChanges={setContractHasUnsavedChanges}
            />
          ) : currentView === 'sales' && salesTab === 'invoices' && selectedInvoiceId ? (
            <InvoiceDetailPanel
              invoiceId={selectedInvoiceId}
              onClose={onClearInvoice}
              onEdit={handleInvoiceEdit}
              onDelete={handleInvoiceDeleteRequest}
              onVoid={handleInvoiceVoidRequest}
              brandColors={brandColors}
            />
          ) : undefined
        }
        rightSidebarTitle={
          aiEditingContract ? 'AI Editor' : 'Invoice Details'
        }
        defaultRightSidebarOpen={!!(currentView === 'sales' && ((salesTab === 'contracts' && aiEditingContract) || (salesTab === 'invoices' && selectedInvoiceId)))}
        rightSidebarOpen={!!(currentView === 'sales' && ((salesTab === 'contracts' && aiEditingContract) || (salesTab === 'invoices' && selectedInvoiceId)))}
        onRightSidebarOpenChange={(open) => {
          if (!open) {
            if (aiEditingContract) setAiEditingContract(null)
            else onClearInvoice()
          }
        }}
        ariaLabel="Commerce module"
      >
        <ModuleLayout.Header title="Commerce" icon={MODULE_ICONS.commerce} data-tour="commerce-overview" />
        <ModuleLayout.Content>
          <div>
        {/* Header */}
        <div className="bg-card/80 backdrop-blur-sm border-b sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Title/Search based on view */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {currentView === 'offering' ? (
                  <div className="min-w-0">
                    <h1 className="text-lg font-semibold text-[var(--text-primary)]">
                      {currentOffering?.type === 'event' ? 'Events' : 
                       currentOffering?.type === 'service' ? 'Services' : 
                       currentOffering?.type === 'class' ? 'Classes' : 
                       currentOffering?.type === 'product' ? 'Products' : 'Offerings'}
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] whitespace-nowrap">
                      {offeringMode === 'edit' 
                        ? `Edit ${currentOffering?.type || 'offering'}`
                        : `View and manage ${currentOffering?.type || 'offering'}`}
                    </p>
                  </div>
                ) : currentView === 'highlights' ? (
                  <div>
                    <h1 className="text-lg font-semibold text-[var(--text-primary)]">Highlights</h1>
                    <p className="text-sm text-[var(--text-secondary)]">Overview of your commerce performance</p>
                  </div>
                ) : currentView === 'services' ? (
                  <div>
                    <h1 className="text-lg font-semibold text-[var(--text-primary)]">Services</h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {currentFilter === 'all' ? 'All services' : `${currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)} services`}
                    </p>
                  </div>
                ) : currentView === 'events' ? (
                  <div>
                    <h1 className="text-lg font-semibold text-[var(--text-primary)]">Events</h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {currentFilter === 'all' ? 'All events' : currentFilter === 'active' ? 'Upcoming events' : currentFilter === 'archived' ? 'Past events' : `${currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)} events`}
                    </p>
                  </div>
                ) : currentView === 'sales' ? (
                  <div>
                    <h1 className="text-lg font-semibold text-[var(--text-primary)]">Sales</h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {salesTab === 'overview' ? 'Revenue overview and analytics' : salesTab === 'contracts' ? 'Manage customer contracts' : salesTab === 'invoices' ? 'Manage your invoices' : 'View all transactions'}
                    </p>
                  </div>
                ) : (
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                    <Input
                      type="search"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-9 bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                    />
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Settings button - show for sales view */}
                {currentView === 'sales' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCommerceSettingsOpen(true)}
                    title="Payment Processor Settings"
                    className="hover:bg-[var(--glass-bg-hover)]"
                  >
                    <Settings className="h-4 w-4 text-[var(--text-secondary)]" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  title={isShopifyMode ? "Sync from Shopify" : "Refresh"}
                  className="hover:bg-[var(--glass-bg-hover)]"
                >
                  <RefreshCw className={cn("h-4 w-4 text-[var(--text-secondary)]", isRefreshing && "animate-spin")} />
                </Button>
                
                {/* View mode toggle - show for products, services, and events */}
                {(currentView === 'products' || currentView === 'services' || currentView === 'events') && (
                  <div className="flex border border-[var(--glass-border)] rounded-lg overflow-hidden">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        "rounded-none border-0",
                        viewMode === 'grid' ? "bg-[var(--glass-bg-hover)]" : "hover:bg-[var(--glass-bg)]"
                      )}
                    >
                      <LayoutGrid className="h-4 w-4 text-[var(--text-secondary)]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className={cn(
                        "rounded-none border-0",
                        viewMode === 'list' ? "bg-[var(--glass-bg-hover)]" : "hover:bg-[var(--glass-bg)]"
                      )}
                    >
                      <List className="h-4 w-4 text-[var(--text-secondary)]" />
                    </Button>
                  </div>
                )}
                
                {/* Primary action based on view */}
                {currentView === 'services' ? (
                  // Services view: Dropdown with Add Service + Create with Signal
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Service
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => startCreating('service')} className="cursor-pointer">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Manually
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setSignalCreating(true)} className="cursor-pointer">
                        <Sparkles className="h-4 w-4 mr-2 text-[var(--brand-primary)]" />
                        Create with Signal
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)} className="cursor-pointer">
                        <Download className="h-4 w-4 mr-2 text-[var(--brand-primary)]" />
                        Import from Signal
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : currentView === 'events' ? (
                  // Events view: Add Event (no payment processor required for free events)
                  <Button 
                    className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white"
                    onClick={() => startCreating('event')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                ) : currentView === 'sales' ? (
                  // Sales view: Create Invoice
                  <Button 
                    className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white"
                    onClick={() => setIsInvoiceDialogOpen(true)}
                    disabled={!hasPaymentProcessor}
                    title={!hasPaymentProcessor ? 'Connect a payment processor first' : ''}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                ) : isShopifyMode ? (
                  // Shopify mode: Sync button
                  <Button 
                    className="bg-[#96bf48] hover:bg-[#7fa93c] text-white"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    <Store className="h-4 w-4 mr-2" />
                    {isRefreshing ? 'Syncing...' : 'Sync Shopify'}
                  </Button>
                ) : currentView === 'products' ? (
                  // Manual products mode: Add Product
                  <Button 
                    className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white"
                    onClick={() => startCreating('product')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                ) : null}
                {/* Settings gear */}
                <Link to="/settings/integrations">
                  <Button variant="ghost" size="sm" className="hover:bg-[var(--glass-bg-hover)]">
                    <Settings className="h-4 w-4 text-[var(--text-secondary)]" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area - no padding when editing proposal (full-bleed) or offering detail */}
        <div className={
          (currentView === 'offering' && offeringId) || (currentView === 'sales' && salesTab === 'contracts' && aiEditingContract)
            ? ''
            : 'px-6 py-4 pb-6'
        }>
          {currentView === 'highlights' && (
            <SignalSuggestsPanel module="commerce" className="mb-4" />
          )}
          {currentView === 'offering' && offeringId ? (
            offeringMode === 'edit' ? (
              <OfferingEdit
                offeringId={offeringId}
                onBack={closeOfferingEdit}
              />
            ) : (
              <OfferingDetail
                offeringId={offeringId}
                onBack={closeOffering}
                onEdit={openOfferingEdit}
              />
            )
          ) : currentView === 'highlights' ? (
            <HighlightsView 
              stats={stats}
              products={products}
              services={services}
              events={events}
              transactions={transactions}
              brandColors={brandColors}
              isShopifyMode={isShopifyMode}
              hasPaymentProcessor={hasPaymentProcessor}
            />
          ) : currentView === 'services' ? (
            creatingType === 'service' ? (
              // Create Service Form (embedded)
              <OfferingCreate 
                type="service" 
                embedded={true}
                onBack={stopCreating}
                onSuccess={handleOfferingCreated}
              />
            ) : signalCreating ? (
              // Create with Signal Form (embedded)
              <CreateWithSignalDialog 
                embedded={true}
                onBack={() => setSignalCreating(false)}
                onSuccess={(generatedData) => {
                  setSignalCreating(false)
                  // Navigate to create form with pre-filled data from Signal
                  // For now, just refresh the services list
                  loadServices?.()
                }}
              />
            ) : (
            <>
              {/* Stats Row for Services View */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatsCard
                  title="Total Services"
                  value={serviceCounts.all}
                  icon={Zap}
                  brandColors={brandColors}
                />
                <StatsCard
                  title="Active Services"
                  value={serviceCounts.active}
                  icon={TrendingUp}
                  brandColors={brandColors}
                />
                <StatsCard
                  title="Total Sold"
                  value={services.reduce((sum, s) => sum + (s.sales_count || 0), 0)}
                  subtitle="All time"
                  icon={ShoppingCart}
                  brandColors={brandColors}
                />
                <StatsCard
                  title="Service Revenue"
                  value={`$${services.reduce((sum, s) => sum + (s.revenue || 0), 0).toLocaleString()}`}
                  subtitle="From services"
                  icon={DollarSign}
                  brandColors={brandColors}
                />
              </div>

              {/* Services List */}
              <ServicesView 
                services={services}
                isLoading={isServicesLoading}
                error={servicesError}
                currentFilter={currentFilter}
                serviceCounts={serviceCounts}
                brandColors={brandColors}
                hasPaymentProcessor={hasPaymentProcessor}
                loadServices={loadServices}
                viewMode={viewMode}
                onOpenSignalDialog={() => setSignalCreating(true)}
                onStartCreating={startCreating}
                onOpenOffering={openOffering}
              />
            </>
            )
          ) : currentView === 'events' ? (
            creatingType === 'event' ? (
              // Create Event Form (embedded)
              <OfferingCreate 
                type="event" 
                embedded={true}
                onBack={stopCreating}
                onSuccess={handleOfferingCreated}
              />
            ) : (
            <>
              {/* Stats Row for Events View */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatsCard
                  title="Total Events"
                  value={eventCounts.all}
                  icon={Calendar}
                  brandColors={brandColors}
                />
                <StatsCard
                  title="Upcoming"
                  value={eventCounts.active}
                  icon={TrendingUp}
                  brandColors={brandColors}
                />
                <StatsCard
                  title="Registrations"
                  value={events.reduce((sum, e) => sum + (e.sales_count || 0), 0)}
                  subtitle="All time"
                  icon={Users}
                  brandColors={brandColors}
                />
                <StatsCard
                  title="Event Revenue"
                  value={`$${events.reduce((sum, e) => sum + (e.revenue || 0), 0).toLocaleString()}`}
                  subtitle="From events"
                  icon={DollarSign}
                  brandColors={brandColors}
                />
              </div>

              {/* Events List */}
              <EventsView 
                events={filteredEvents}
                isLoading={isEventsLoading}
                error={eventsError}
                currentFilter={currentFilter}
                eventCounts={eventCounts}
                brandColors={brandColors}
                hasPaymentProcessor={hasPaymentProcessor}
                loadEvents={loadEvents}
                viewMode={viewMode}
                onStartCreating={startCreating}
                onOpenOffering={openOffering}
                onDuplicate={handleDuplicateEvent}
              />
            </>
            )
          ) : currentView === 'sales' ? (
            <>
              {/* Sales View Content */}
              {salesTab === 'overview' ? (
                <SalesOverviewView 
                  projectId={projectId}
                  invoices={invoices}
                  transactions={transactions}
                  isLoading={isInvoicesLoading || isTransactionsLoading}
                  invoiceCounts={invoiceCounts}
                  brandColors={brandColors}
                  hasPaymentProcessor={hasPaymentProcessor}
                  onOpenIntegrations={() => setIsIntegrationsDialogOpen(true)}
                />
              ) : salesTab === 'contracts' ? (
                <ContractsView 
                  ref={contractsViewRef}
                  brandColors={brandColors}
                  onNavigate={onNavigate}
                  hasSignal={hasSignal}
                  projectId={projectId}
                  isCreatingContract={isCreatingContract}
                  onNewContract={() => setIsCreatingContract(true)}
                  onCancelContract={() => setIsCreatingContract(false)}
                  aiEditingContract={aiEditingContract}
                  setAiEditingContract={setAiEditingContract}
                  hasUnsavedChanges={contractHasUnsavedChanges}
                  onSaveContract={handleSaveContract}
                  isSavingContract={isSavingContract}
                  onHasUnsavedChanges={setContractHasUnsavedChanges}
                  showAnalytics={false}
                  onToggleAnalytics={() => {}}
                />
              ) : salesTab === 'invoices' ? (
                <InvoicesView 
                  invoices={invoices}
                  isLoading={isInvoicesLoading}
                  error={invoicesError}
                  invoiceCounts={invoiceCounts}
                  brandColors={brandColors}
                  loadInvoices={loadInvoices}
                  projectId={projectId}
                  isAgencyOrg={isAgencyOrg}
                />
              ) : (
                <TransactionsView 
                  transactions={transactions}
                  isLoading={isTransactionsLoading}
                  error={transactionsError}
                  brandColors={brandColors}
                  loadTransactions={loadTransactions}
                />
              )}
            </>
          ) : currentView === 'customers' ? (
            <>
              {/* Customers View Content */}
              <CustomersView 
                customersTab={customersTab}
                brandColors={brandColors}
                enabledTypes={enabledTypes}
              />
            </>
          ) : (
            creatingType === 'product' ? (
              // Create Product Form (embedded)
              <OfferingCreate 
                type="product" 
                embedded={true}
                onBack={stopCreating}
                onSuccess={handleOfferingCreated}
              />
            ) : (
            <>
              {/* Stats Row for Products View */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatsCard
                  title="Total Products"
                  value={stats?.total_products || products.length}
                  icon={Package}
                  brandColors={brandColors}
                />
                <StatsCard
                  title="Active Products"
                  value={stats?.active_products || statusCounts.active}
                  icon={TrendingUp}
                  brandColors={brandColors}
                />
                <StatsCard
                  title="Low Stock"
                  value={lowStockCount}
                  subtitle={lowStockCount > 0 ? "Needs attention" : "All stocked"}
                  icon={AlertTriangle}
                  brandColors={brandColors}
                />
                <StatsCard
                  title="Total Revenue"
                  value={`$${Number(stats?.total_revenue || 0).toLocaleString()}`}
                  subtitle="From products"
                  icon={DollarSign}
                  brandColors={brandColors}
                />
              </div>

              {/* Product Grid */}
              <ProductsView 
                products={products}
                isLoading={isLoading}
                error={error}
                currentFilter={currentFilter}
                statusCounts={statusCounts}
                brandColors={brandColors}
                isShopifyMode={isShopifyMode}
                hasPaymentProcessor={hasPaymentProcessor}
                viewMode={viewMode}
                loadProducts={loadProducts}
                onStartCreating={startCreating}
                onOpenOffering={openOffering}
                onSyncShopify={handleSyncShopify}
              />
            </>
            )
          )}
        </div>
          </div>
        </ModuleLayout.Content>
      </ModuleLayout>

      {/* Create Invoice Dialog */}
      <InvoiceCreateDialog
        open={isInvoiceDialogOpen}
        onOpenChange={setIsInvoiceDialogOpen}
        brandColors={brandColors}
        onSuccess={() => {
          // Reload invoices after creating one
          loadInvoices?.()
        }}
      />

      {/* Edit Invoice Dialog */}
      <InvoiceEditDialog
        open={!!editingInvoiceId}
        onOpenChange={(open) => !open && setEditingInvoiceId(null)}
        invoiceId={editingInvoiceId}
        onSuccess={handleInvoiceEditSuccess}
      />

      {/* Delete invoice confirmation */}
      <ConfirmDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title="Delete invoice"
        description="This will permanently remove the invoice. This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleInvoiceDeleteConfirm}
        isLoading={deleteInvoiceMutation.isPending}
      />

      {/* Void invoice confirmation */}
      <ConfirmDialog
        open={!!pendingVoidId}
        onOpenChange={(open) => !open && setPendingVoidId(null)}
        title="Void invoice"
        description="This will mark the invoice as cancelled. The record will be kept for your records."
        confirmText="Void"
        variant="default"
        onConfirm={handleInvoiceVoidConfirm}
        isLoading={voidInvoiceMutation.isPending}
      />

      {/* Create with Signal Dialog */}
      <CreateWithSignalDialog
        open={isSignalDialogOpen}
        onOpenChange={setIsSignalDialogOpen}
      />

      {/* Import from Signal Dialog */}
      <ImportFromSignalDialog
        projectId={projectId}
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={(result) => {
          // Refresh the offerings list after import
          loadServices()
          loadEvents()
        }}
      />

      {/* Commerce Settings Dialog */}
      <CommerceSettings
        projectId={projectId}
        open={isCommerceSettingsOpen}
        onOpenChange={setIsCommerceSettingsOpen}
      />

      {/* Categories Management Dialog */}
      <CategoriesManagement
        open={isCategoriesOpen}
        onOpenChange={setIsCategoriesOpen}
        onCategoryChange={loadCategories}
      />

      {/* Inventory Management Dialog */}
      <InventoryManagement
        open={isInventoryOpen}
        onOpenChange={setIsInventoryOpen}
      />

      {/* Discount Codes Management Dialog */}
      <DiscountCodesManagement
        open={isDiscountsOpen}
        onOpenChange={setIsDiscountsOpen}
      />

      {/* Project Integrations Dialog */}
      <ProjectIntegrationsDialog
        open={isIntegrationsDialogOpen}
        onOpenChange={setIsIntegrationsDialogOpen}
        project={currentProject}
      />

      {/* Individual Integration Dialogs */}
      <ShopifySetupDialog
        open={isShopifyDialogOpen}
        onOpenChange={setIsShopifyDialogOpen}
        projectId={projectId}
        onSuccess={() => {
          setIsShopifyDialogOpen(false)
          // Refresh settings to update integration status
          window.location.reload()
        }}
      />

      <StripeSetupDialog
        open={isStripeDialogOpen}
        onOpenChange={setIsStripeDialogOpen}
        projectId={projectId}
        onSuccess={() => {
          setIsStripeDialogOpen(false)
          window.location.reload()
        }}
      />

      <SquareSetupDialog
        open={isSquareDialogOpen}
        onOpenChange={setIsSquareDialogOpen}
        projectId={projectId}
        onSuccess={() => {
          setIsSquareDialogOpen(false)
          window.location.reload()
        }}
      />
    </TooltipProvider>
  )
}

