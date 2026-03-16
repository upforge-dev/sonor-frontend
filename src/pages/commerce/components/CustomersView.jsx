// src/pages/commerce/components/CustomersView.jsx
// Customer views for Commerce dashboard

import { useState, useEffect } from 'react'
import useAuthStore from '@/lib/auth-store'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import EmailComposeDialog from '@/components/crm/EmailComposeDialog'
import {
  Plus,
  Search,
  Users,
  Crown,
  Tag,
  Copy,
  Upload,
  Download,
  Mail,
} from 'lucide-react'

export function CustomersView({ customersTab, brandColors, enabledTypes = ['product', 'service'] }) {
  const { currentProject, currentOrg } = useAuthStore()
  const [customers, setCustomers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Email compose dialog state
  const [isEmailComposeOpen, setIsEmailComposeOpen] = useState(false)
  const [emailComposeTarget, setEmailComposeTarget] = useState(null)
  
  const projectId = currentProject?.id
  
  // Detect if this is Sonor org - use contacts table instead
  const isUptradeMediaOrg = !currentOrg || currentOrg?.slug === 'uptrade-media' || 
                            currentOrg?.domain === 'sonor.io' || 
                            currentOrg?.org_type === 'agency'
  
  // Open email dialog for a customer
  const handleSendEmail = (customer) => {
    // Transform customer to contact format for EmailComposeDialog
    setEmailComposeTarget({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      company: customer.company,
    })
    setIsEmailComposeOpen(true)
  }
  
  const loadCustomers = async () => {
    if (!projectId) return
    setIsLoading(true)
    setError(null)
    
    try {
      // All orgs now use unified contacts table with contact_type = 'customer'
      const { data, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('project_id', projectId)
        .eq('contact_type', 'customer')
        .order('created_at', { ascending: false })
      
      if (fetchError) throw fetchError
      
      // Map contacts to customer format
      const mapped = (data || []).map(contact => ({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        created_at: contact.created_at,
        // Purchase tracking can be added via commerce_sales aggregation
        total_purchases: contact.total_purchases || 0,
        total_spent: contact.total_spent || 0,
        last_purchase_at: contact.last_purchase_at || null,
        purchase_types: contact.purchase_types || [],
        tags: contact.tags || [],
        source: contact.source,
        metadata: contact.metadata,
      }))
      
      setCustomers(mapped)
    } catch (err) {
      console.error('Error loading customers:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }
  
  useEffect(() => {
    loadCustomers()
  }, [projectId, isUptradeMediaOrg])
  
  // Filter customers based on tab
  const getFilteredCustomers = () => {
    let filtered = customers
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.includes(query)
      )
    }
    
    // Apply tab-specific filters
    switch (customersTab) {
      case 'new':
        // Customers from last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        filtered = filtered.filter(c => new Date(c.created_at) >= thirtyDaysAgo)
        break
      case 'repeat':
        filtered = filtered.filter(c => (c.total_purchases || 0) > 1)
        break
      case 'vip':
        filtered = filtered.filter(c => (c.total_spent || 0) >= 500 || c.tags?.includes('vip'))
        break
      case 'at-risk':
        // No purchase in last 90 days but had previous purchases
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
        filtered = filtered.filter(c => 
          c.last_purchase_at && 
          new Date(c.last_purchase_at) < ninetyDaysAgo &&
          (c.total_purchases || 0) > 0
        )
        break
      case 'product-buyers':
        filtered = filtered.filter(c => c.purchase_types?.includes('product'))
        break
      case 'service-clients':
        filtered = filtered.filter(c => c.purchase_types?.includes('service'))
        break
      case 'event-attendees':
        filtered = filtered.filter(c => c.purchase_types?.includes('event'))
        break
      default:
        break
    }
    
    return filtered
  }
  
  const filteredCustomers = getFilteredCustomers()
  
  // Stats for header
  const stats = {
    total: customers.length,
    new: customers.filter(c => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return new Date(c.created_at) >= thirtyDaysAgo
    }).length,
    totalSpent: customers.reduce((sum, c) => sum + (c.total_spent || 0), 0),
  }
  
  // Special views for organization tabs
  if (customersTab === 'segments') {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border border-border/50">
        <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-medium text-foreground mb-2">Segments & Tags</h3>
        <p className="text-muted-foreground mb-4">Create customer segments and manage tags</p>
        <Button 
          className="text-white"
          style={{ backgroundColor: brandColors?.primary || '#3b82f6' }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Segment
        </Button>
      </div>
    )
  }
  
  if (customersTab === 'duplicates') {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border border-border/50">
        <Copy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-medium text-foreground mb-2">Find Duplicates</h3>
        <p className="text-muted-foreground mb-4">Identify and merge duplicate customer records</p>
        <Button 
          className="text-white"
          style={{ backgroundColor: brandColors?.primary || '#3b82f6' }}
        >
          <Search className="h-4 w-4 mr-2" />
          Scan for Duplicates
        </Button>
      </div>
    )
  }
  
  if (customersTab === 'import-export') {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border border-border/50">
        <Download className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-medium text-foreground mb-2">Import / Export</h3>
        <p className="text-muted-foreground mb-6">Manage your customer data in bulk</p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
    )
  }
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-xl bg-muted/30 border border-border/50 p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
              <div className="h-4 bg-muted rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border border-border/50">
        <p className="text-red-500">{error}</p>
        <Button 
          variant="outline" 
          onClick={loadCustomers} 
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Stats Header - Sync-style flat design */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-muted/30 border border-border/50 p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-sm text-muted-foreground">Total Customers</p>
        </div>
        <div className="rounded-xl bg-muted/30 border border-border/50 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-500">+{stats.new}</p>
          <p className="text-sm text-muted-foreground">New (30 days)</p>
        </div>
        <div className="rounded-xl bg-muted/30 border border-border/50 p-4 text-center">
          <p className="text-2xl font-bold text-foreground">${stats.totalSpent.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Total Revenue</p>
        </div>
      </div>
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>
      
      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl border border-border/50">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {customers.length === 0 ? 'No customers yet' : 'No matching customers'}
          </h3>
          <p className="text-muted-foreground">
            {customers.length === 0 
              ? 'Customers will appear here after their first purchase'
              : 'Try adjusting your search or filter'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/50 p-4 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div 
                  className="h-10 w-10 rounded-full flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: brandColors?.primary || '#3b82f6' }}
                >
                  {customer.name?.charAt(0).toUpperCase() || customer.email?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">
                      {customer.name || 'Unnamed'}
                    </p>
                    {customer.tags?.includes('vip') && (
                      <Crown className="h-4 w-4 text-amber-500" />
                    )}
                    {(customer.total_purchases || 0) > 3 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                        Repeat
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{customer.email}</p>
                </div>
                
                {/* Email button - shows on hover */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSendEmail(customer)
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-muted"
                  title="Send email"
                >
                  <Mail className="h-4 w-4" />
                </Button>
                
                <div className="text-right">
                  <p className="font-medium text-foreground">
                    ${(customer.total_spent || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {customer.total_purchases || 0} orders
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Email Compose Dialog - uses unified Gmail OAuth */}
      <EmailComposeDialog
        open={isEmailComposeOpen}
        onOpenChange={(open) => {
          setIsEmailComposeOpen(open)
          if (!open) {
            setEmailComposeTarget(null)
          }
        }}
        contact={emailComposeTarget}
        audits={[]}
        proposals={[]}
        onSent={() => {
          // Could refresh customer data or show success
        }}
      />
    </div>
  )
}
