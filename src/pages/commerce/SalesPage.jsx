// src/pages/commerce/SalesPage.jsx
// Sales list and management
// MIGRATED TO REACT QUERY HOOKS - Jan 29, 2026

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCommerceSales, useUpdateCommerceSale, useShipSale, useBatchShip } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import useAuthStore from '@/lib/auth-store'
import portalApi from '@/lib/portal-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Clock,
  MoreHorizontal,
  Eye,
  Check,
  RefreshCw,
  Calendar,
  Package,
  Truck,
  Download,
  Copy,
  ExternalLink,
} from 'lucide-react'
import { toast } from '@/lib/toast'

const statusConfig = {
  pending: { label: 'Pending', variant: 'secondary', icon: Clock },
  deposit_paid: { label: 'Deposit Paid', variant: 'outline', icon: DollarSign },
  completed: { label: 'Completed', variant: 'default', icon: Check },
  refunded: { label: 'Refunded', variant: 'destructive', icon: RefreshCw },
  cancelled: { label: 'Cancelled', variant: 'outline', icon: null },
}

const shippingStatusConfig = {
  unshipped: { label: 'Unshipped', className: 'text-amber-600 border-amber-500/30' },
  shipped: { label: 'Shipped', className: 'text-blue-600 border-blue-500/30' },
  delivered: { label: 'Delivered', className: 'text-green-600 border-green-500/30' },
}

function getShippingStatus(sale) {
  if (sale.shipping_status === 'delivered') return 'delivered'
  if (sale.shipping_status === 'shipped' || sale.shipping_tracking_number) return 'shipped'
  if (sale.shipping_address) return 'unshipped'
  return null
}

export default function SalesPage() {
  const { currentProject } = useAuthStore()
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [selectedForShip, setSelectedForShip] = useState(new Set())
  const [selectedSale, setSelectedSale] = useState(null)
  const [buyingLabel, setBuyingLabel] = useState(false)
  const queryClient = useQueryClient()
  const updateSaleMutation = useUpdateCommerceSale()
  const shipSaleMutation = useShipSale()
  const batchShipMutation = useBatchShip()

  const filters = useMemo(() => {
    const filterObj = {
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }
    
    // Add date range based on filter
    if (dateFilter !== 'all') {
      const now = new Date()
      let startDate
      
      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
      }
      
      if (startDate) {
        filterObj.start_date = startDate.toISOString()
      }
    }
    
    return filterObj
  }, [statusFilter, dateFilter])

  const { data: salesData, isLoading: salesLoading, error: salesError } = useCommerceSales(
    currentProject?.id,
    filters
  )

  const sales = salesData || []

  // Calculate stats from sales data
  const salesStats = useMemo(() => {
    if (!sales || sales.length === 0) {
      return {
        totalRevenue: 0,
        totalSales: 0,
        completedSales: 0,
        pendingSales: 0,
      }
    }

    return {
      totalRevenue: sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0),
      totalSales: sales.length,
      completedSales: sales.filter(s => s.status === 'completed').length,
      pendingSales: sales.filter(s => s.status === 'pending').length,
    }
  }, [sales])

  const handleComplete = async (saleId) => {
    if (window.confirm('Mark this sale as completed?')) {
      try {
        await updateSaleMutation.mutateAsync({
          projectId: currentProject?.id,
          saleId,
          data: { status: 'completed' }
        })
        toast.success('Sale marked as completed')
      } catch (error) {
        toast.error('Failed to update sale')
      }
    }
  }

  const handleRefund = async (saleId) => {
    const reason = window.prompt('Enter refund reason (optional):')
    if (reason !== null) {
      try {
        await updateSaleMutation.mutateAsync({
          projectId: currentProject?.id,
          saleId,
          data: { 
            status: 'refunded',
            refund_reason: reason || undefined
          }
        })
        toast.success('Sale refunded')
      } catch (error) {
        toast.error('Failed to refund sale')
      }
    }
  }

  const handleShip = async (saleId) => {
    try {
      const result = await shipSaleMutation.mutateAsync({
        projectId: currentProject?.id,
        saleId,
      })
      toast.success('Label generated')
      if (result?.labelUrl) {
        window.open(result.labelUrl, '_blank')
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to generate label')
    }
  }

  const handleBatchShip = async () => {
    const ids = Array.from(selectedForShip)
    if (ids.length === 0) {
      toast.error('Select orders to ship')
      return
    }
    try {
      const result = await batchShipMutation.mutateAsync({
        projectId: currentProject?.id,
        saleIds: ids,
      })
      const { success, failed } = result
      if (failed?.length > 0) {
        toast.warning(`Shipped ${success.length}, failed ${failed.length}`)
      } else {
        toast.success(`Shipped ${success.length} order(s)`)
      }
      setSelectedForShip(new Set())
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Batch ship failed')
    }
  }

  const handleBuyLabel = async (sale) => {
    setBuyingLabel(true)
    try {
      const response = await portalApi.post(`/commerce/shipping/${currentProject?.id}/${sale.id}/buy-label`)
      const updated = response.data
      // Refresh sales list and update the selected sale with fresh data
      queryClient.invalidateQueries({ queryKey: ['commerce', 'sales'] })
      // Merge updated shipping fields into selectedSale so the dialog updates immediately
      setSelectedSale(prev => ({ ...prev, ...updated }))
      toast.success('Shipping label created')
      if (updated?.shipping_label_url) {
        window.open(updated.shipping_label_url, '_blank')
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to create shipping label')
    } finally {
      setBuyingLabel(false)
    }
  }

  const shippableSales = sales.filter(s => s.shipping_address && (s.payment_status === 'paid' || s.status === 'completed') && s.shipping_status !== 'shipped')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales</h1>
          <p className="text-muted-foreground">
            View and manage all transactions
          </p>
        </div>
        {shippableSales.length > 0 && (
          <div className="flex items-center gap-2">
            {selectedForShip.size > 0 && (
              <Button
                onClick={handleBatchShip}
                disabled={batchShipMutation.isPending}
              >
                <Package className="h-4 w-4 mr-2" />
                Ship {selectedForShip.size} Selected
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(salesStats?.totalRevenue || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesStats?.totalSales || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesStats?.completedSales || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesStats?.pendingSales || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="deposit_paid">Deposit Paid</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sale Detail Dialog */}
      <SaleDetailDialog
        sale={selectedSale}
        open={!!selectedSale}
        onOpenChange={(open) => { if (!open) setSelectedSale(null) }}
        projectId={currentProject?.id}
        onBuyLabel={handleBuyLabel}
        buyingLabel={buyingLabel}
        onShip={handleShip}
        shipPending={shipSaleMutation.isPending}
      />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {salesLoading ? (
            <TableSkeleton />
          ) : salesError ? (
            <div className="p-6 text-center text-red-600">
              Failed to load sales: {salesError}
            </div>
          ) : sales.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No sales found</h3>
              <p className="text-muted-foreground">
                Sales will appear here when customers make purchases
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {shippableSales.length > 0 && (
                    <TableHead className="w-[40px]">
                      <input
                        type="checkbox"
                        checked={selectedForShip.size === shippableSales.length && shippableSales.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedForShip(new Set(shippableSales.map(s => s.id)))
                          } else {
                            setSelectedForShip(new Set())
                          }
                        }}
                        className="rounded"
                      />
                    </TableHead>
                  )}
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Offering</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Shipping</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map(sale => {
                  const config = statusConfig[sale.status] || statusConfig.pending
                  const canShip = sale.shipping_address && (sale.payment_status === 'paid' || sale.status === 'completed') && sale.shipping_status !== 'shipped'
                  
                  return (
                    <TableRow key={sale.id}>
                      {shippableSales.length > 0 && (
                        <TableCell>
                          {canShip ? (
                            <input
                              type="checkbox"
                              checked={selectedForShip.has(sale.id)}
                              onChange={(e) => {
                                const next = new Set(selectedForShip)
                                if (e.target.checked) next.add(sale.id)
                                else next.delete(sale.id)
                                setSelectedForShip(next)
                              }}
                              className="rounded"
                            />
                          ) : null}
                        </TableCell>
                      )}
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {new Date(sale.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(sale.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {sale.customer ? (
                          <Link
                            to={`/commerce/customers/${sale.customer.id}`}
                            className="hover:underline"
                          >
                            {sale.customer.name || sale.customer.email}
                          </Link>
                        ) : (sale.customer_name || sale.customer_email) ? (
                          <span>{sale.customer_name || sale.customer_email}</span>
                        ) : (
                          <span className="text-muted-foreground">Anonymous</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sale.offering ? (
                          <Link
                            to={`/commerce/offerings/${sale.offering.id}`}
                            className="hover:underline"
                          >
                            {sale.offering.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                        {sale.quantity > 1 && (
                          <span className="text-muted-foreground"> × {sale.quantity}</span>
                        )}
                        {sale.offering?.type === 'event' && sale.schedule?.starts_at && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(sale.schedule.starts_at).toLocaleDateString()}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            ${sale.total_amount?.toLocaleString()}
                          </p>
                          {sale.deposit_amount && sale.remaining_amount > 0 && (
                            <p className="text-sm text-muted-foreground">
                              ${sale.deposit_amount} paid, ${sale.remaining_amount} due
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant}>
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const shippingStatus = getShippingStatus(sale)
                          if (!shippingStatus) return <span className="text-muted-foreground text-sm">—</span>
                          const cfg = shippingStatusConfig[shippingStatus]
                          return (
                            <div className="space-y-1">
                              <Badge variant="outline" className={cfg.className}>
                                {shippingStatus === 'shipped' && <Truck className="h-3 w-3 mr-1" />}
                                {shippingStatus === 'delivered' && <Check className="h-3 w-3 mr-1" />}
                                {cfg.label}
                              </Badge>
                              {sale.shipping_tracking_number && (
                                <p className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                                  {sale.shipping_tracking_number}
                                </p>
                              )}
                              {sale.shipping_billing_status === 'failed' && (
                                <Badge variant="destructive" className="text-[10px]">
                                  Billing failed
                                </Badge>
                              )}
                            </div>
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedSale(sale)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {canShip && (
                              <DropdownMenuItem
                                onClick={() => handleShip(sale.id)}
                                disabled={shipSaleMutation.isPending}
                              >
                                <Package className="h-4 w-4 mr-2" />
                                Ship
                              </DropdownMenuItem>
                            )}
                            {(sale.status === 'pending' || sale.status === 'deposit_paid') && (
                              <DropdownMenuItem onClick={() => handleComplete(sale.id)}>
                                <Check className="h-4 w-4 mr-2" />
                                Mark Complete
                              </DropdownMenuItem>
                            )}
                            {sale.status === 'completed' && (
                              <DropdownMenuItem
                                onClick={() => handleRefund(sale.id)}
                                className="text-red-600"
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refund
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ShippingStatusBadge({ sale }) {
  const status = getShippingStatus(sale)
  if (!status) return null
  const cfg = shippingStatusConfig[status]
  return (
    <Badge variant="outline" className={cfg.className}>
      {status === 'shipped' && <Truck className="h-3 w-3 mr-1" />}
      {status === 'delivered' && <Check className="h-3 w-3 mr-1" />}
      {status === 'unshipped' && <Package className="h-3 w-3 mr-1" />}
      {cfg.label}
    </Badge>
  )
}

function SaleDetailDialog({ sale, open, onOpenChange, projectId, onBuyLabel, buyingLabel, onShip, shipPending }) {
  if (!sale) return null

  const shippingStatus = getShippingStatus(sale)
  const hasLabel = !!sale.shipping_label_url
  const hasTracking = !!sale.shipping_tracking_number
  const hasShippingAddress = !!sale.shipping_address
  const isProduct = sale.offering?.type === 'product' || hasShippingAddress
  const canBuyLabel = isProduct && hasShippingAddress && !hasLabel && !hasTracking
  const canShip = hasShippingAddress && (sale.payment_status === 'paid' || sale.status === 'completed') && sale.shipping_status !== 'shipped'

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard'))
  }

  const config = statusConfig[sale.status] || statusConfig.pending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Sale Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sale Summary */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Date</p>
              <p className="font-medium">{new Date(sale.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Status</p>
              <Badge variant={config.variant}>{config.label}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Customer</p>
              <p className="font-medium">
                {sale.customer?.name || sale.customer?.email || sale.customer_name || sale.customer_email || 'Anonymous'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Amount</p>
              <p className="font-medium">${sale.total_amount?.toLocaleString()}</p>
            </div>
            {sale.offering && (
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs mb-0.5">Offering</p>
                <p className="font-medium">{sale.offering.name}</p>
              </div>
            )}
          </div>

          {/* Shipping Section */}
          {(hasShippingAddress || hasLabel || hasTracking) && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Shipping
                </h3>
                <ShippingStatusBadge sale={sale} />
              </div>

              {/* Shipping Address */}
              {hasShippingAddress && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Ship to</p>
                  <div className="text-sm">
                    {typeof sale.shipping_address === 'string' ? (
                      <p>{sale.shipping_address}</p>
                    ) : (
                      <>
                        {sale.shipping_address.name && <p className="font-medium">{sale.shipping_address.name}</p>}
                        {sale.shipping_address.line1 && <p>{sale.shipping_address.line1}</p>}
                        {sale.shipping_address.line2 && <p>{sale.shipping_address.line2}</p>}
                        {(sale.shipping_address.city || sale.shipping_address.state || sale.shipping_address.postal_code) && (
                          <p>
                            {[sale.shipping_address.city, sale.shipping_address.state, sale.shipping_address.postal_code]
                              .filter(Boolean).join(', ')}
                          </p>
                        )}
                        {sale.shipping_address.country && <p>{sale.shipping_address.country}</p>}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Carrier / Service */}
              {(sale.shipping_carrier || sale.shipping_service) && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {sale.shipping_carrier && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Carrier</p>
                      <p className="font-medium capitalize">{sale.shipping_carrier}</p>
                    </div>
                  )}
                  {sale.shipping_service && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Service</p>
                      <p className="font-medium">{sale.shipping_service}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tracking Number */}
              {hasTracking && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tracking Number</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                      {sale.shipping_tracking_number}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => copyToClipboard(sale.shipping_tracking_number)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      asChild
                    >
                      <a
                        href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${sale.shipping_tracking_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              {/* Label & Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {hasLabel && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={sale.shipping_label_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Download Label
                    </a>
                  </Button>
                )}

                {canBuyLabel && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onBuyLabel(sale)}
                    disabled={buyingLabel}
                  >
                    <Package className="h-3.5 w-3.5 mr-1.5" />
                    {buyingLabel ? 'Creating Label...' : 'Create Shipping Label'}
                  </Button>
                )}

                {canShip && !hasLabel && !canBuyLabel && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onShip(sale.id)}
                    disabled={shipPending}
                  >
                    <Package className="h-3.5 w-3.5 mr-1.5" />
                    {shipPending ? 'Generating...' : 'Generate Label'}
                  </Button>
                )}

                {sale.shipping_billing_status === 'failed' && (
                  <Badge variant="destructive" className="text-xs">Billing failed</Badge>
                )}
                {sale.shipping_billing_status === 'succeeded' && (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-500/30">Charged</Badge>
                )}
              </div>
            </div>
          )}

          {/* No shipping info but is a product type */}
          {isProduct && !hasShippingAddress && !hasLabel && !hasTracking && (
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                No shipping address on file for this sale.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  )
}
