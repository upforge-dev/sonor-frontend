// MIGRATED TO REACT QUERY HOOKS - Jan 29, 2026
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import SubscriptionTab from './SubscriptionTab'
import { AreaChart, BarChart, DonutChart } from '@tremor/react'
import { 
  DollarSign, 
  Receipt, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Plus,
  Eye,
  Edit,
  CreditCard,
  TrendingUp,
  Calendar,
  Loader2,
  Download,
  Send,
  Bell,
  ExternalLink,
  Mail,
  Repeat,
  Pause,
  Play,
  BarChart3,
  Trash,
  RefreshCw
} from 'lucide-react'
import { 
  useInvoices, 
  useBillingSummary, 
  useOverdueInvoices,
  useCreateInvoice,
  useUpdateInvoice,
  useMarkInvoicePaid,
  useDeleteInvoice,
  useSendInvoice,
  useSendReminder,
  useToggleRecurringPause,
  billingKeys,
} from '@/lib/hooks/use-billing'
import { useProjects } from '@/lib/hooks/use-projects'
import { useFinancialReport } from '@/lib/hooks/use-reports'
import { useQueryClient } from '@tanstack/react-query'
import useAuthStore from '@/lib/auth-store'
import InvoicePaymentDialog from './InvoicePaymentDialog'
import { adminApi, billingApi } from '@/lib/portal-api'
import { EmptyState } from '@/components/EmptyState'
import { TableSkeleton, CardSkeleton, ListSkeleton } from '@/components/skeletons'
import { ModuleLayout } from '@/components/ModuleLayout'
import { MODULE_ICONS } from '@/lib/module-icons'

const Billing = () => {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  
  // React Query hooks - auto-fetch
  const { data: projectsData } = useProjects()
  const projects = projectsData?.projects || projectsData || []
  
  const { data: invoicesData, isLoading, isError: invoicesError, refetch: refetchInvoices } = useInvoices()
  const invoices = invoicesData?.invoices || []
  
  const { data: summary } = useBillingSummary()
  const { data: overdueData } = useOverdueInvoices()
  const overdueInvoices = overdueData?.invoices || overdueData || []
  
  const { data: financialReport, isLoading: reportsLoading, refetch: refetchFinancialReport } = useFinancialReport()
  
  // Mutations
  const createInvoiceMutation = useCreateInvoice()
  const updateInvoiceMutation = useUpdateInvoice()
  const markPaidMutation = useMarkInvoicePaid()
  const deleteInvoiceMutation = useDeleteInvoice()
  const sendInvoiceMutation = useSendInvoice()
  const sendReminderMutation = useSendReminder()
  const toggleRecurringMutation = useToggleRecurringPause()

  const safeOverdueInvoices = Array.isArray(overdueInvoices) ? overdueInvoices : []
  
  // Helper functions (previously from store)
  const getRecurringIntervalLabel = (interval) => {
    const labels = { weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' }
    return labels[interval] || interval
  }
  
  const getStatusColor = (status) => {
    const colors = { draft: 'bg-gray-100 text-gray-800', sent: 'bg-blue-100 text-blue-800', paid: 'bg-green-100 text-green-800', overdue: 'bg-red-100 text-red-800', cancelled: 'bg-gray-100 text-gray-500' }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }
  
  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
  const formatDate = (date) => date ? new Date(date).toLocaleDateString() : ''
  const formatDateTime = (date) => date ? new Date(date).toLocaleString() : ''
  const isOverdue = (invoice) => invoice.status === 'sent' && new Date(invoice.due_date) < new Date()
  const getDaysOverdue = (invoice) => Math.floor((new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24))
  
  // Helper function to get default due date (14 days from now)
  const getDefaultDueDate = () => {
    const date = new Date()
    date.setDate(date.getDate() + 14)
    return date.toISOString().split('T')[0]
  }
  
  const [activeTab, setActiveTab] = useState('overview')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [sendingInvoiceId, setSendingInvoiceId] = useState(null)
  const [sendingReminderId, setSendingReminderId] = useState(null)
  const [togglingRecurringId, setTogglingRecurringId] = useState(null)
  const [clients, setClients] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [orgMembers, setOrgMembers] = useState([])
  const [reportDateFilters, setReportDateFilters] = useState({ start_date: '', end_date: '' })
  const [formData, setFormData] = useState({
    organizationId: '',
    contactId: '',
    project_id: '',
    amount: '',
    tax_rate: '0',
    due_date: getDefaultDueDate(),
    description: '',
    status: 'pending',
    // Recurring invoice fields
    isRecurring: false,
    recurringInterval: '',
    recurringDayOfMonth: '',
    recurringEndDate: '',
    recurringCount: ''
  })
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [invoiceToPay, setInvoiceToPay] = useState(null)
  
  // Quick Invoice state
  const [isQuickInvoiceDialogOpen, setIsQuickInvoiceDialogOpen] = useState(false)
  const [quickInvoiceLoading, setQuickInvoiceLoading] = useState(false)
  const [quickInvoiceSuccess, setQuickInvoiceSuccess] = useState(null)
  const [quickInvoiceData, setQuickInvoiceData] = useState({
    email: '',
    name: '',
    company: '',
    amount: '',
    description: '',
    due_date: getDefaultDueDate(),
    send_now: true
  })
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: null,
    confirmText: 'Confirm',
    variant: 'default'
  })
  
  // Alert dialog state
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    title: '',
    description: '',
    variant: 'default'
  })

  // React Query auto-fetches; invalidate all billing data when we need to refresh
  const refreshBilling = () => {
    queryClient.invalidateQueries({ queryKey: billingKeys.all })
  }
  
  // Set default tab based on user type
  const { currentOrg, currentProject, isSuperAdmin } = useAuthStore()
  
  // Agency org should show admin view, client orgs show tenant view
  const isAgencyOrg = currentOrg?.org_type === 'agency'

  // Billing is ORG-LEVEL ONLY - not accessible to project-level users
  const isInProjectContext = !!currentProject && !isAgencyOrg
  const isOrgLevelUser = !!currentOrg && !isInProjectContext
  const computedIsAdmin = (user?.role === 'admin' || isSuperAdmin) && isAgencyOrg
  
  // Restrict access: Billing is for org-level users only
  if (!isOrgLevelUser && !computedIsAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <AlertTriangle className="h-16 w-16 text-yellow-500" />
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Access Restricted</h2>
        <p className="text-[var(--text-secondary)] text-center max-w-md">
          Billing is only available at the organization level. Project-level users do not have access to billing information.
        </p>
        <p className="text-sm text-[var(--text-tertiary)]">
          Please contact your organization administrator if you need access.
        </p>
      </div>
    )
  }
  
  useEffect(() => {
    // Set appropriate default tab when component mounts or user type changes
    if (!computedIsAdmin && activeTab === 'overview') {
      setActiveTab('unpaid')
    }
  }, [computedIsAdmin])

  // Fetch clients and organizations for admin users
  useEffect(() => {
    if (computedIsAdmin) {
      fetchClients()
      fetchOrganizations()
    }
  }, [computedIsAdmin])

  const fetchClients = async () => {
    try {
      const response = await adminApi.listClients()
      setClients(response.data.clients || response.data || [])
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    }
  }

  const fetchOrganizations = async () => {
    try {
      const response = await adminApi.listOrganizations()
      const orgs = response.data?.organizations || response.data || []
      setOrganizations(Array.isArray(orgs) ? orgs : [])
    } catch (err) {
      console.error('Failed to fetch organizations:', err)
      setOrganizations([])
    }
  }

  const fetchOrgMembers = async (orgId) => {
    if (!orgId) {
      setOrgMembers([])
      return
    }
    try {
      const response = await adminApi.listOrgMembers(orgId)
      setOrgMembers(response.data.members || response.data || [])
    } catch (err) {
      console.error('Failed to fetch org members:', err)
      setOrgMembers([])
    }
  }

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const resetForm = () => {
    setFormData({
      organizationId: '',
      contactId: '',
      project_id: '',
      amount: '',
      tax_rate: '0',
      due_date: getDefaultDueDate(),
      description: '',
      status: 'pending',
      // Recurring invoice fields
      isRecurring: false,
      recurringInterval: '',
      recurringDayOfMonth: '',
      recurringEndDate: '',
      recurringCount: ''
    })
    setOrgMembers([])
  }

  const handleCreateInvoice = async (e) => {
    e.preventDefault()
    
    const invoiceData = {
      organizationId: formData.organizationId || null,
      contactId: formData.contactId,
      projectId: formData.project_id || null,
      amount: parseFloat(formData.amount),
      taxRate: parseFloat(formData.tax_rate),
      dueDate: formData.due_date,
      description: formData.description || null,
      // Recurring invoice fields
      isRecurring: formData.isRecurring,
      recurringInterval: formData.isRecurring ? formData.recurringInterval : null,
      recurringDayOfMonth: formData.isRecurring && formData.recurringDayOfMonth ? parseInt(formData.recurringDayOfMonth) : null,
      recurringEndDate: formData.isRecurring && formData.recurringEndDate ? formData.recurringEndDate : null,
      recurringCount: formData.isRecurring && formData.recurringCount ? parseInt(formData.recurringCount) : null
    }
    
    const result = await createInvoiceMutation.mutateAsync(invoiceData)
    
    if (result.success) {
      setIsCreateDialogOpen(false)
      resetForm()
      refreshBilling()
    }
  }

  const handleEditInvoice = async (e) => {
    e.preventDefault()
    
    if (!selectedInvoice) return
    
    const invoiceData = {
      ...formData,
      amount: parseFloat(formData.amount),
      tax_rate: parseFloat(formData.tax_rate)
    }
    
    const result = await updateInvoiceMutation.mutateAsync({ invoiceId: selectedInvoice.id, updates: invoiceData })
    
    if (result.success) {
      setIsEditDialogOpen(false)
      setSelectedInvoice(null)
      resetForm()
    }
  }
  
  const handleQuickInvoice = async (e) => {
    e.preventDefault()
    setQuickInvoiceLoading(true)
    setQuickInvoiceSuccess(null)
    
    try {
      const response = await billingApi.createQuickInvoice(quickInvoiceData)
      
      if (response.data.success) {
        setQuickInvoiceSuccess({
          invoice: response.data.invoice,
          payment_url: response.data.payment_url
        })
        
        refreshBilling()
        
        // Reset form after showing success
        setTimeout(() => {
          setQuickInvoiceData({
            email: '',
            name: '',
            company: '',
            amount: '',
            description: '',
            due_date: '',
            send_now: true
          })
        }, 5000)
      }
    } catch (err) {
      console.error('Quick invoice error:', err)
      setAlertDialog({
        open: true,
        title: 'Failed to Create Invoice',
        description: err.response?.data?.error || 'Failed to create quick invoice',
        variant: 'destructive'
      })
    } finally {
      setQuickInvoiceLoading(false)
    }
  }
  
  const resetQuickInvoiceDialog = () => {
    setIsQuickInvoiceDialogOpen(false)
    setQuickInvoiceSuccess(null)
    setQuickInvoiceData({
      email: '',
      name: '',
      company: '',
      amount: '',
      description: '',
      due_date: getDefaultDueDate(),
      send_now: true
    })
  }

  const openEditDialog = (invoice) => {
    setSelectedInvoice(invoice)
    setFormData({
      project_id: invoice.project?.id?.toString() || '',
      amount: invoice.amount?.toString() || '',
      tax_rate: ((invoice.taxAmount / invoice.amount) * 100).toFixed(2) || '0',
      due_date: invoice.dueDate || '',
      description: invoice.description || '',
      status: invoice.status || 'pending'
    })
    setIsEditDialogOpen(true)
  }

  const handleMarkPaid = async (invoice) => {
    setConfirmDialog({
      open: true,
      title: 'Mark Invoice as Paid',
      description: `Mark invoice ${invoice.invoiceNumber} as paid?`,
      onConfirm: async () => {
        await markPaidMutation.mutateAsync(invoice.id)
        setConfirmDialog({ ...confirmDialog, open: false })
      },
      confirmText: 'Mark Paid',
      variant: 'default'
    })
  }

  const handleSendInvoice = async (invoice) => {
    if (invoice.status === 'paid') return
    
    const recipientEmail = invoice.sentToEmail || invoice.contact?.email || 'recipient'
    const action = invoice.sentAt ? 'Resend' : 'Send'
    const description = invoice.sentAt 
      ? `Resend invoice ${invoice.invoiceNumber} to ${recipientEmail}?`
      : `Send invoice ${invoice.invoiceNumber} to ${recipientEmail}?`
    
    setConfirmDialog({
      open: true,
      title: `${action} Invoice`,
      description,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false })
        setSendingInvoiceId(invoice.id)
        const result = await sendInvoiceMutation.mutateAsync(invoice.id)
        setSendingInvoiceId(null)
        
        if (result.success) {
          refreshBilling()
        }
      },
      confirmText: action,
      variant: 'default'
    })
  }

  const handleSendReminder = async (invoice) => {
    if (invoice.status === 'paid') return
    if (!invoice.hasPaymentToken && !invoice.sentAt) {
      setAlertDialog({
        open: true,
        title: 'Cannot Send Reminder',
        description: 'Please send the invoice first before sending reminders.',
        variant: 'warning'
      })
      return
    }
    
    const recipientEmail = invoice.sentToEmail || invoice.contact?.email || 'recipient'
    
    setConfirmDialog({
      open: true,
      title: 'Send Payment Reminder',
      description: `Send payment reminder for ${invoice.invoiceNumber} to ${recipientEmail}? (Reminder ${(invoice.reminderCount || 0) + 1}/3)`,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false })
        setSendingReminderId(invoice.id)
        const result = await sendReminderMutation.mutateAsync(invoice.id)
        setSendingReminderId(null)
        
        if (result.success) {
          refreshBilling()
        }
      },
      confirmText: 'Send Reminder',
      variant: 'default'
    })
  }

  const handleToggleRecurring = async (invoice) => {
    if (!invoice.isRecurring) return
    
    const action = invoice.recurringPaused ? 'resume' : 'pause'
    const actionLabel = action === 'pause' ? 'Pause' : 'Resume'
    
    setConfirmDialog({
      open: true,
      title: `${actionLabel} Recurring Invoice`,
      description: `${actionLabel} recurring invoice ${invoice.invoiceNumber}?`,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false })
        setTogglingRecurringId(invoice.id)
        const result = await toggleRecurringMutation.mutateAsync({ invoiceId: invoice.id, paused: !invoice.recurringPaused })
        setTogglingRecurringId(null)
        
        if (result.success) {
          refreshBilling()
        }
      },
      confirmText: actionLabel,
      variant: 'default'
    })
  }

  const handleDeleteInvoice = async (invoice) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Invoice',
      description: `Delete invoice ${invoice.invoiceNumber}? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false })
        const result = await deleteInvoiceMutation.mutateAsync(invoice.id)

        if (result.success) {
          refreshBilling()
          setAlertDialog({
            open: true,
            title: 'Invoice Deleted',
            description: 'Invoice has been deleted successfully.',
            variant: 'success'
          })
        } else {
          setAlertDialog({
            open: true,
            title: 'Delete Failed',
            description: result.error || 'Failed to delete invoice.',
            variant: 'destructive'
          })
        }
      },
      confirmText: 'Delete',
      variant: 'destructive'
    })
  }

  const openPaymentDialog = (invoice) => {
    setInvoiceToPay(invoice)
    setPaymentDialogOpen(true)
  }

  const handlePaymentSuccess = () => {
    refreshBilling()
    setPaymentDialogOpen(false)
    setInvoiceToPay(null)
  }

  const filteredInvoices = statusFilter 
    ? (invoices || []).filter(invoice => invoice.status === statusFilter)
    : (invoices || [])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'overdue':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  // Use already-computed isAdmin from above (computedIsAdmin), and derive tenantName
  const isAdmin = computedIsAdmin
  const tenantName = currentOrg?.name || 'Your Account'

  const headerActions = isAdmin ? (
    <div className="flex gap-2">
            <Dialog open={isQuickInvoiceDialogOpen} onOpenChange={setIsQuickInvoiceDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Mail className="w-4 h-4 mr-2" />
                  Quick Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Quick Invoice</DialogTitle>
                  <DialogDescription>
                    Send a one-off invoice to anyone via email with magic payment link.
                  </DialogDescription>
                </DialogHeader>
                
                {quickInvoiceSuccess ? (
                  <div className="space-y-4">
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Invoice created successfully! {quickInvoiceData.send_now && 'Email sent with payment link.'}
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-2">
                      <Label>Payment Link</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={quickInvoiceSuccess.payment_url} 
                          readOnly 
                          className="font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(quickInvoiceSuccess.payment_url)
                            setAlertDialog({
                              open: true,
                              title: 'Link Copied',
                              description: 'Payment link has been copied to clipboard!',
                              variant: 'success'
                            })
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        Share this link directly or via the email that was sent.
                      </p>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={resetQuickInvoiceDialog}>
                        Close
                      </Button>
                      <Button 
                        variant="glass-primary" 
                        onClick={() => {
                          setQuickInvoiceSuccess(null)
                          setQuickInvoiceData({
                            email: '',
                            name: '',
                            company: '',
                            amount: '',
                            description: '',
                            due_date: '',
                            send_now: true
                          })
                        }}
                      >
                        Create Another
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleQuickInvoice} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="quick_email">Email Address *</Label>
                      <Input
                        id="quick_email"
                        type="email"
                        value={quickInvoiceData.email}
                        onChange={(e) => setQuickInvoiceData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="client@example.com"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quick_name">Name</Label>
                        <Input
                          id="quick_name"
                          value={quickInvoiceData.name}
                          onChange={(e) => setQuickInvoiceData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="John Doe"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="quick_company">Company</Label>
                        <Input
                          id="quick_company"
                          value={quickInvoiceData.company}
                          onChange={(e) => setQuickInvoiceData(prev => ({ ...prev, company: e.target.value }))}
                          placeholder="Acme Inc"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quick_amount">Amount ($) *</Label>
                        <Input
                          id="quick_amount"
                          type="number"
                          step="0.01"
                          value={quickInvoiceData.amount}
                          onChange={(e) => setQuickInvoiceData(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="0.00"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="quick_due_date">Due Date *</Label>
                        <Input
                          id="quick_due_date"
                          type="date"
                          value={quickInvoiceData.due_date}
                          onChange={(e) => setQuickInvoiceData(prev => ({ ...prev, due_date: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="quick_description">Description</Label>
                      <Textarea
                        id="quick_description"
                        value={quickInvoiceData.description}
                        onChange={(e) => setQuickInvoiceData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Services rendered..."
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="quick_send_now" 
                        checked={quickInvoiceData.send_now}
                        onCheckedChange={(checked) => setQuickInvoiceData(prev => ({ ...prev, send_now: checked }))}
                      />
                      <Label htmlFor="quick_send_now" className="cursor-pointer">
                        Send email immediately with payment link
                      </Label>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsQuickInvoiceDialogOpen(false)}
                        disabled={quickInvoiceLoading}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={quickInvoiceLoading || !quickInvoiceData.email || !quickInvoiceData.amount || !quickInvoiceData.due_date}
                        variant="glass-primary"
                      >
                        {quickInvoiceLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            {quickInvoiceData.send_now ? 'Create & Send' : 'Create Invoice'}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </DialogContent>
            </Dialog>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="glass-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>
                  Generate a new invoice for an organization.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="organizationId">Organization *</Label>
                  <Select 
                    value={formData.organizationId} 
                    onValueChange={(value) => {
                      handleFormChange('organizationId', value)
                      handleFormChange('contactId', '') // Reset contact when org changes
                      fetchOrgMembers(value)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(organizations) ? organizations : []).filter(org => org.id).map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactId">Send Invoice To *</Label>
                  <Select 
                    value={formData.contactId} 
                    onValueChange={(value) => handleFormChange('contactId', value)}
                    disabled={!formData.organizationId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.organizationId ? "Select recipient" : "Select organization first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {orgMembers.filter(member => member.contact?.id).map((member) => (
                        <SelectItem key={member.contact.id} value={member.contact.id}>
                          {member.contact.name || member.contact.email} ({member.contact.email})
                        </SelectItem>
                      ))}
                      {/* Also show from clients list if they match org */}
                      {orgMembers.length === 0 && clients.filter(client => client.id).map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} ({client.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="project_id">Project (Optional)</Label>
                  <Select 
                    value={formData.project_id || 'none'} 
                    onValueChange={(value) => handleFormChange('project_id', value === 'none' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects.filter(project => project.id).map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount ($) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => handleFormChange('amount', e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                    <Input
                      id="tax_rate"
                      type="number"
                      step="0.01"
                      value={formData.tax_rate}
                      onChange={(e) => handleFormChange('tax_rate', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date *</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => handleFormChange('due_date', e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    placeholder="Invoice description"
                    rows={3}
                  />
                </div>

                {/* Recurring Invoice Options */}
                <div className="space-y-4 pt-4 border-t border-[var(--glass-border)]">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="isRecurring" 
                      checked={formData.isRecurring}
                      onCheckedChange={(checked) => handleFormChange('isRecurring', checked)}
                    />
                    <Label htmlFor="isRecurring" className="flex items-center gap-2 cursor-pointer">
                      <Repeat className="w-4 h-4" />
                      Make this a recurring invoice
                    </Label>
                  </div>

                  {formData.isRecurring && (
                    <div className="space-y-4 pl-6">
                      <div className="space-y-2">
                        <Label htmlFor="recurringInterval">Billing Frequency *</Label>
                        <Select 
                          value={formData.recurringInterval} 
                          onValueChange={(value) => handleFormChange('recurringInterval', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                            <SelectItem value="annual">Annual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {['monthly', 'quarterly', 'semi-annual', 'annual'].includes(formData.recurringInterval) && (
                        <div className="space-y-2">
                          <Label htmlFor="recurringDayOfMonth">Day of Month</Label>
                          <Select 
                            value={formData.recurringDayOfMonth} 
                            onValueChange={(value) => handleFormChange('recurringDayOfMonth', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select day (1-28)" />
                            </SelectTrigger>
                            <SelectContent>
                              {[...Array(28)].map((_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {i + 1}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-[var(--text-muted)]">
                            Invoice will be generated on this day each period
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="recurringEndDate">End Date (Optional)</Label>
                          <Input
                            id="recurringEndDate"
                            type="date"
                            value={formData.recurringEndDate}
                            onChange={(e) => handleFormChange('recurringEndDate', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="recurringCount">Max Invoices (Optional)</Label>
                          <Input
                            id="recurringCount"
                            type="number"
                            min="1"
                            value={formData.recurringCount}
                            onChange={(e) => handleFormChange('recurringCount', e.target.value)}
                            placeholder="e.g. 12"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        Leave both blank for indefinite recurring. Set one or both to limit.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isLoading || !formData.organizationId || !formData.contactId || !formData.amount || !formData.due_date || (formData.isRecurring && !formData.recurringInterval)}
                    variant="glass-primary"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      formData.isRecurring ? 'Create Recurring Invoice' : 'Create Invoice'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
    </div>
  ) : null

  return (
    <ModuleLayout ariaLabel="Billing">
      <ModuleLayout.Header
        title="Billing"
        icon={MODULE_ICONS.billing}
        subtitle={isOrgLevelUser ? `Invoices and payments for ${tenantName}` : 'Manage invoices and billing information'}
        actions={headerActions}
      />
      <ModuleLayout.Content>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Admin gets full tabs, Tenants get simplified view */}
        {isAdmin ? (
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="invoices">All Invoices</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
        ) : (
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
          </TabsList>
        )}

        {/* ===== SUBSCRIPTION TAB (both admin and tenant) ===== */}
        <TabsContent value="subscription">
          <SubscriptionTab />
        </TabsContent>

        {/* ===== ADMIN TABS ===== */}
        {isAdmin && (
          <>
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-secondary)]">Total Revenue</p>
                      <p className="text-2xl font-bold text-[var(--text-primary)]">
                        {formatCurrency(summary.totalRevenue)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-[var(--accent-success)]/20 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-[var(--accent-success)]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-secondary)]">Pending</p>
                      <p className="text-2xl font-bold text-[var(--accent-warning)]">
                        {formatCurrency(summary.pendingAmount)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-[var(--accent-warning)]/20 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-[var(--accent-warning)]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-secondary)]">This Month</p>
                      <p className="text-2xl font-bold text-[var(--accent-success)]">
                        {formatCurrency(summary.thisMonthRevenue)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-[var(--accent-success)]/20 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-[var(--accent-success)]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-secondary)]">Overdue</p>
                      <p className="text-2xl font-bold text-[var(--accent-error)]">
                        {formatCurrency(summary.overdueAmount)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-[var(--accent-error)]/20 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-[var(--accent-error)]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Latest billing activity</CardDescription>
            </CardHeader>
            <CardContent>
              {summary?.recentInvoices?.length === 0 ? (
                <EmptyState.Card
                  icon={Receipt}
                  title="No invoices yet"
                  description="Invoices will appear here once created."
                />
              ) : (
                <div className="space-y-4">
                  {summary?.recentInvoices?.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border border-[var(--glass-border)] rounded-xl bg-[var(--glass-bg)] backdrop-blur-sm">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-[var(--brand-primary)]/10 rounded-xl flex items-center justify-center">
                          <Receipt className="w-5 h-5 text-[var(--brand-primary)]" />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-[var(--text-secondary)]">{invoice.projectName || invoice.contactName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(invoice.totalAmount)}</p>
                        <Badge className={getStatusColor(invoice.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(invoice.status)}
                            <span className="capitalize">{invoice.status}</span>
                          </div>
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {invoicesError && (
            <Alert variant="destructive" className="flex items-center justify-between gap-4">
              <AlertDescription>
                Failed to load invoices. Check your connection and try again.
              </AlertDescription>
              <Button variant="outline" size="sm" onClick={() => refetchInvoices()} className="shrink-0">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </Alert>
          )}

          {/* Invoices List */}
          {isLoading && filteredInvoices.length === 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <TableSkeleton rows={6} cols={5} />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={Receipt}
                  title="No invoices found"
                  description={
                    statusFilter
                      ? `No invoices with status "${statusFilter}".`
                      : 'No invoices have been created yet.'
                  }
                  actionLabel={isAdmin && !statusFilter ? 'Create First Invoice' : undefined}
                  onAction={isAdmin && !statusFilter ? () => setIsCreateDialogOpen(true) : undefined}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredInvoices.map((invoice) => (
                <Card key={invoice.id} className="group hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-4">
                    {/* Compact View - Always Visible */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-[#4bbf39]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          {invoice.isRecurring ? (
                            <Repeat className="w-5 h-5 text-[#4bbf39]" />
                          ) : (
                            <Receipt className="w-5 h-5 text-[#4bbf39]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-base">{invoice.invoiceNumber}</h4>
                            <Badge className={getStatusColor(isOverdue(invoice) ? 'overdue' : invoice.status)}>
                              <span className="capitalize text-xs">
                                {isOverdue(invoice) ? 'Overdue' : invoice.status}
                              </span>
                            </Badge>
                          </div>
                          <p className="text-sm text-[var(--text-secondary)] truncate">
                            {invoice.sentToEmail || invoice.contact?.email || 'No recipient'}
                          </p>
                          {invoice.lastViewedAt && (
                            <p className="text-xs text-[var(--text-tertiary)]">
                              Last viewed: {formatDateTime(invoice.lastViewedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-xl font-bold">{formatCurrency(invoice.totalAmount)}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Due: {formatDate(invoice.dueDate)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Expanded View - Shows on Hover */}
                    <div className="max-h-0 overflow-hidden group-hover:max-h-96 transition-all duration-300 ease-in-out">
                      <div className="pt-4 mt-4 border-t space-y-3">
                        {/* Full Details */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-[var(--text-tertiary)]">Description:</span>
                            <p className="text-[var(--text-primary)] font-medium">
                              {invoice.project?.title || invoice.projectName || invoice.description}
                            </p>
                          </div>
                          {invoice.contact?.company && (
                            <div>
                              <span className="text-[var(--text-tertiary)]">Company:</span>
                              <p className="text-[var(--text-primary)] font-medium">{invoice.contact.company}</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Admin Tracking Info */}
                        {isAdmin && invoice.status !== 'paid' && (
                          <div className="flex flex-wrap gap-4 text-sm text-[var(--text-tertiary)]">
                            {invoice.sentAt && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5" />
                                <span>Sent: {formatDate(invoice.sentAt)}</span>
                              </div>
                            )}
                            {invoice.viewCount > 0 && (
                              <div className="flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" />
                                <span>Views: {invoice.viewCount}</span>
                              </div>
                            )}
                            {invoice.reminderCount > 0 && (
                              <div className="flex items-center gap-1">
                                <Bell className="w-3.5 h-3.5" />
                                <span>Reminders: {invoice.reminderCount}/3</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        {isAdmin && (
                          <div className="flex flex-wrap gap-2">
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Use token as path (matches email URL format)
                                const paymentUrl = invoice.paymentToken 
                                  ? `${window.location.origin}/pay/${invoice.paymentToken}`
                                  : null
                                if (paymentUrl) {
                                  window.open(paymentUrl, '_blank')
                                } else {
                                  // No token - invoice hasn't been sent yet
                                  alert('Send the invoice first to generate a payment link')
                                }
                              }}
                              disabled={!invoice.paymentToken}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            {invoice.status !== 'paid' && (
                              <>
                                <Button 
                                  variant={invoice.sentAt ? "outline" : "default"}
                                  size="sm"
                                  onClick={() => handleSendInvoice(invoice)}
                                  disabled={sendingInvoiceId === invoice.id}
                                >
                                  {sendingInvoiceId === invoice.id ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Send className="w-4 h-4 mr-2" />
                                  )}
                                  {invoice.sentAt ? 'Resend' : 'Send'}
                                </Button>
                                {invoice.sentAt && (
                                  <Button 
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSendReminder(invoice)}
                                    disabled={sendingReminderId === invoice.id || invoice.reminderCount >= 3}
                                  >
                                    {sendingReminderId === invoice.id ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <Bell className="w-4 h-4 mr-2" />
                                    )}
                                    Remind
                                  </Button>
                                )}
                                <Button 
                                  size="sm"
                                  variant="glass-primary"
                                  onClick={() => handleMarkPaid(invoice)}
                                >
                                  <CreditCard className="w-4 h-4 mr-2" />
                                  Mark Paid
                                </Button>
                              </>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openEditDialog(invoice)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteInvoice(invoice)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            >
                              <Trash className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                            {invoice.isRecurring && (
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleRecurring(invoice)}
                                disabled={togglingRecurringId === invoice.id}
                              >
                                {togglingRecurringId === invoice.id ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : invoice.recurringPaused ? (
                                  <Play className="w-4 h-4 mr-2" />
                                ) : (
                                  <Pause className="w-4 h-4 mr-2" />
                                )}
                                {invoice.recurringPaused ? 'Resume' : 'Pause'}
                              </Button>
                            )}
                          </div>
                        )}
                        
                        {/* Client Pay Button */}
                        {!isAdmin && (invoice.status === 'pending' || invoice.status === 'sent' || isOverdue(invoice)) && (
                          <Button 
                            onClick={() => openPaymentDialog(invoice)}
                            variant="glass-primary"
                            className="w-full"
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pay Now - {formatCurrency(invoice.totalAmount)}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          {(safeOverdueInvoices.length === 0) ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No overdue invoices</h3>
                <p className="text-[var(--text-secondary)] text-center">
                  All invoices are up to date. Great job!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You have {(overdueInvoices || []).length} overdue invoice{(overdueInvoices || []).length !== 1 ? 's' : ''} requiring attention.
                </AlertDescription>
              </Alert>
              
              {safeOverdueInvoices.map((invoice) => (
                <Card key={invoice.id} className="border-red-200 bg-red-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg">{invoice.invoiceNumber}</h4>
                          <p className="text-[var(--text-secondary)]">{invoice.projectName}</p>
                          <p className="text-sm text-red-600 font-medium">
                            {invoice.daysOverdue} days overdue
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600">
                          {formatCurrency(invoice.totalAmount)}
                        </p>
                        <p className="text-sm text-[var(--text-tertiary)]">
                          Due: {formatDate(invoice.dueDate)}
                        </p>
                        {isAdmin ? (
                          <Button 
                            size="sm"
                            variant="glass-primary"
                            onClick={() => handleMarkPaid(invoice)}
                            className="mt-2"
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Mark Paid
                          </Button>
                        ) : (
                          <Button 
                            size="sm"
                            onClick={() => openPaymentDialog(invoice)}
                            className="mt-2 bg-red-600 hover:bg-red-700 text-white"
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pay Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Financial Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          {/* Date Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Label htmlFor="report_start_date">Start Date</Label>
                  <Input
                    id="report_start_date"
                    type="date"
                    value={reportDateFilters.start_date}
                    onChange={(e) => setReportDateFilters(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="report_end_date">End Date</Label>
                  <Input
                    id="report_end_date"
                    type="date"
                    value={reportDateFilters.end_date}
                    onChange={(e) => setReportDateFilters(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
                <div className="flex space-x-2 pt-6">
                  <Button 
                    onClick={() => refetchFinancialReport()} 
                    disabled={reportsLoading}
                  >
                    {reportsLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load Report'
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setReportDateFilters({ start_date: '', end_date: '' })
                      refetchFinancialReport()
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Load prompt if no data */}
          {!financialReport && !reportsLoading && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Financial Reports</h3>
                <p className="text-[var(--text-secondary)] text-center mb-4">
                  Click "Load Report" to view detailed financial analytics
                </p>
                <Button 
                  variant="glass-primary"
                  onClick={() => refetchFinancialReport()}
                  disabled={reportsLoading}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Load Financial Report
                </Button>
              </CardContent>
            </Card>
          )}

          {financialReport && (
            <>
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(financialReport.summary?.total_revenue || 0)}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">Total Revenue</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(financialReport.summary?.avg_invoice_value || 0)}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">Avg Invoice Value</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">
                        {formatCurrency(financialReport.summary?.overdue_amount || 0)}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">Overdue Amount</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {financialReport.summary?.avg_payment_days || 0}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">Avg Payment Days</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Monthly Revenue Trend
                  </CardTitle>
                  <CardDescription>Revenue breakdown by month</CardDescription>
                </CardHeader>
                <CardContent>
                  {financialReport.breakdown?.monthly_revenue?.length > 0 ? (
                    <AreaChart
                      data={financialReport.breakdown.monthly_revenue}
                      index="month_name"
                      categories={['revenue']}
                      colors={['emerald']}
                      valueFormatter={(v) => formatCurrency(v)}
                      className="h-72"
                      showLegend={false}
                      showGridLines={true}
                    />
                  ) : (
                    <div className="h-72 flex items-center justify-center text-[var(--text-tertiary)]">
                      No monthly revenue data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Invoice Status Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Invoice Status Distribution</CardTitle>
                    <CardDescription>Breakdown by payment status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {financialReport.breakdown?.status_distribution?.length > 0 ? (
                      <DonutChart
                        data={financialReport.breakdown.status_distribution.map(s => ({
                          name: s.status?.charAt(0).toUpperCase() + s.status?.slice(1) || 'Unknown',
                          count: s.count || 0
                        }))}
                        index="name"
                        category="count"
                        colors={['emerald', 'amber', 'rose', 'gray']}
                        className="h-64"
                        showLabel={true}
                      />
                    ) : (
                      <div className="h-64 flex items-center justify-center text-[var(--text-tertiary)]">
                        No status data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Client</CardTitle>
                    <CardDescription>Top clients by revenue</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {financialReport.breakdown?.top_clients?.length > 0 ? (
                      <BarChart
                        data={financialReport.breakdown.top_clients.slice(0, 5)}
                        index="client_name"
                        categories={['total_revenue']}
                        colors={['blue']}
                        valueFormatter={(v) => formatCurrency(v)}
                        className="h-64"
                        showLegend={false}
                      />
                    ) : (
                      <div className="h-64 flex items-center justify-center text-[var(--text-tertiary)]">
                        No client revenue data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
          </>
        )}
        
        {/* ===== TENANT TABS - Simplified Invoice View ===== */}
        {!isAdmin && (
          <>
            {/* Unpaid Invoices Tab */}
            <TabsContent value="unpaid" className="space-y-4">
              {isLoading && invoices.length === 0 ? (
                <ListSkeleton items={4} showAvatar={false} />
              ) : invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled').length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">All caught up!</h3>
                    <p className="text-[var(--text-secondary)] text-center">
                      You have no unpaid invoices.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {invoices
                    .filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                    .map((invoice) => (
                      <Card key={invoice.id} className={`${isOverdue(invoice) ? 'border-red-300 bg-red-50/50' : ''}`}>
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOverdue(invoice) ? 'bg-red-100' : 'bg-[var(--brand-primary)]/10'}`}>
                                {isOverdue(invoice) ? (
                                  <AlertTriangle className="w-6 h-6 text-red-600" />
                                ) : (
                                  <Receipt className="w-6 h-6 text-[var(--brand-primary)]" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-semibold text-lg">{invoice.invoiceNumber}</h4>
                                <p className="text-sm text-[var(--text-secondary)]">
                                  {invoice.description || invoice.projectName || 'Invoice'}
                                </p>
                                <p className={`text-sm ${isOverdue(invoice) ? 'text-red-600 font-medium' : 'text-[var(--text-tertiary)]'}`}>
                                  {isOverdue(invoice) 
                                    ? `${getDaysOverdue(invoice)} days overdue`
                                    : `Due: ${formatDate(invoice.dueDate)}`
                                  }
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className={`text-2xl font-bold ${isOverdue(invoice) ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>
                                {formatCurrency(invoice.totalAmount)}
                              </p>
                              <Button 
                                onClick={() => openPaymentDialog(invoice)}
                                className={`mt-2 ${isOverdue(invoice) ? 'bg-red-600 hover:bg-red-700' : ''}`}
                                size="sm"
                              >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Pay Now
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </TabsContent>

            {/* Paid Invoices Tab */}
            <TabsContent value="paid" className="space-y-4">
              {isLoading && invoices.length === 0 ? (
                <ListSkeleton items={4} showAvatar={false} />
              ) : invoices.filter(inv => inv.status === 'paid').length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Receipt className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No paid invoices</h3>
                    <p className="text-[var(--text-secondary)] text-center">
                      Your payment history will appear here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {invoices
                    .filter(inv => inv.status === 'paid')
                    .sort((a, b) => new Date(b.paidAt || b.updatedAt) - new Date(a.paidAt || a.updatedAt))
                    .map((invoice) => (
                      <Card key={invoice.id}>
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-lg">{invoice.invoiceNumber}</h4>
                                <p className="text-sm text-[var(--text-secondary)]">
                                  {invoice.description || invoice.projectName || 'Invoice'}
                                </p>
                                <p className="text-sm text-[var(--text-tertiary)]">
                                  Paid: {formatDate(invoice.paidAt || invoice.updatedAt)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(invoice.totalAmount)}
                              </p>
                              <Badge className="bg-green-100 text-green-800 mt-1">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Paid
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Edit Invoice Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              Update invoice details and status.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditInvoice} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_project_id">Project</Label>
              <Select 
                value={formData.project_id || 'none'} 
                onValueChange={(value) => handleFormChange('project_id', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.filter(project => project.id).map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_amount">Amount ($)</Label>
                <Input
                  id="edit_amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleFormChange('amount', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_tax_rate">Tax Rate (%)</Label>
                <Input
                  id="edit_tax_rate"
                  type="number"
                  step="0.01"
                  value={formData.tax_rate}
                  onChange={(e) => handleFormChange('tax_rate', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_due_date">Due Date</Label>
              <Input
                id="edit_due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => handleFormChange('due_date', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleFormChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Invoice description"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setSelectedInvoice(null)
                  resetForm()
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="glass-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Invoice'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invoice Payment Dialog (for clients) */}
      <InvoicePaymentDialog
        invoice={invoiceToPay}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onPaymentSuccess={handlePaymentSuccess}
      />
      
      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
            >
              Cancel
            </Button>
            <Button 
              variant={confirmDialog.variant === 'destructive' ? 'destructive' : 'default'}
              onClick={confirmDialog.onConfirm}
            >
              {confirmDialog.confirmText}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Alert Dialog */}
      <Dialog open={alertDialog.open} onOpenChange={(open) => setAlertDialog({ ...alertDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={
              alertDialog.variant === 'success' ? 'text-green-600' : 
              alertDialog.variant === 'warning' ? 'text-yellow-600' : 
              alertDialog.variant === 'destructive' ? 'text-red-600' : ''
            }>
              {alertDialog.title}
            </DialogTitle>
            <DialogDescription>{alertDialog.description}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button 
              variant="default"
              onClick={() => setAlertDialog({ ...alertDialog, open: false })}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </ModuleLayout.Content>
    </ModuleLayout>
  )
}

export default Billing
