// src/components/commerce/InventoryManagement.jsx
// Manage product inventory levels
// Supports both top-level inventory and per-variant (clothing) inventory
// MIGRATED TO REACT QUERY HOOKS - Jan 29, 2026

import { useState, useMemo } from 'react'
import useAuthStore from '@/lib/auth-store'
import { useCommerceOfferings, useUpdateCommerceOffering, commerceKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Package,
  AlertTriangle,
  TrendingDown,
  Check,
  Loader2,
  Save,
  RefreshCw,
  Search,
} from 'lucide-react'
import { toast } from '@/lib/toast'

/** Get total stock for an offering (sum variants for clothing, otherwise top-level) */
function getTotalStock(product) {
  if (product.is_clothing && product.variants?.length > 0) {
    return product.variants.reduce((sum, v) => sum + (v.inventory_count ?? 0), 0)
  }
  return product.inventory_count ?? 0
}

function getStockStatus(count) {
  if (count <= 0) return { variant: 'destructive', label: 'Out of Stock', icon: AlertTriangle }
  if (count <= 5) return { variant: 'secondary', label: 'Low Stock', icon: TrendingDown }
  return { variant: 'outline', label: 'In Stock', icon: Check }
}

export default function InventoryManagement({ open, onOpenChange }) {
  const { currentProject } = useAuthStore()
  const queryClient = useQueryClient()
  const updateMutation = useUpdateCommerceOffering()

  const { data: allOfferings, isLoading, refetch } = useCommerceOfferings(
    currentProject?.id,
    { type: 'product', limit: 200 },
    { enabled: !!currentProject?.id && open }
  )

  const [editedQuantities, setEditedQuantities] = useState({})
  const [saving, setSaving] = useState({})
  const [search, setSearch] = useState('')

  // Include products that have track_inventory OR are clothing (variant-level tracking)
  const products = useMemo(() => {
    if (!allOfferings) return []
    return allOfferings.filter(p => p.track_inventory || (p.is_clothing && p.variants?.length > 0))
  }, [allOfferings])

  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
    )
  }, [products, search])

  // Stats
  const outOfStock = products.filter(p => getTotalStock(p) <= 0).length
  const lowStock = products.filter(p => { const s = getTotalStock(p); return s > 0 && s <= 5 }).length
  const inStock = products.filter(p => getTotalStock(p) > 5).length

  const handleQuantityChange = (productId, value) => {
    setEditedQuantities(prev => ({ ...prev, [productId]: value }))
  }

  const handleSave = async (product) => {
    const newQuantity = parseInt(editedQuantities[product.id] || '0', 10)
    if (isNaN(newQuantity) || newQuantity < 0) {
      toast.error('Invalid quantity')
      return
    }
    if (newQuantity === (product.inventory_count ?? 0)) return

    setSaving(prev => ({ ...prev, [product.id]: true }))
    try {
      await updateMutation.mutateAsync({
        offeringId: product.id,
        data: { inventory_count: newQuantity },
      })
      toast.success(`Updated ${product.name} inventory`)
    } catch (err) {
      console.error('Failed to update inventory:', err)
      toast.error('Failed to update inventory')
    } finally {
      setSaving(prev => ({ ...prev, [product.id]: false }))
    }
  }

  const handleSaveAll = async () => {
    const changed = products.filter(p => {
      const newQty = parseInt(editedQuantities[p.id] || '0', 10)
      return !isNaN(newQty) && newQty !== (p.inventory_count ?? 0) && !p.is_clothing
    })
    if (changed.length === 0) {
      toast.info('No changes to save')
      return
    }
    let ok = 0
    for (const product of changed) {
      try {
        const newQuantity = parseInt(editedQuantities[product.id] || '0', 10)
        await updateMutation.mutateAsync({
          offeringId: product.id,
          data: { inventory_count: newQuantity },
        })
        ok++
      } catch (err) {
        console.error(`Failed to update ${product.name}:`, err)
      }
    }
    if (ok > 0) {
      toast.success(`Updated ${ok} products`)
      refetch()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Management
          </DialogTitle>
          <DialogDescription>
            Manage stock levels for your products
          </DialogDescription>
        </DialogHeader>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Out of Stock</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-red-600">{outOfStock}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">Low Stock</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-amber-600">{lowStock}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">In Stock</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-green-600">{inStock}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleSaveAll} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            Save All
          </Button>
        </div>

        {/* Products Table */}
        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                {products.length === 0
                  ? 'No products with inventory tracking enabled'
                  : 'No products match your search'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Enable inventory tracking on products to manage stock here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-48">Stock</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => {
                  const totalStock = getTotalStock(product)
                  const status = getStockStatus(totalStock)
                  const isClothingWithVariants = product.is_clothing && product.variants?.length > 0

                  // For non-clothing: editable single quantity
                  const isChanged = !isClothingWithVariants && (
                    parseInt(editedQuantities[product.id] || String(product.inventory_count ?? 0), 10) !== (product.inventory_count ?? 0)
                  )

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.featured_image_url ? (
                            <img
                              src={product.featured_image_url}
                              alt={product.name}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ${product.price?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.sku || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>
                          <status.icon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isClothingWithVariants ? (
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{totalStock} total</p>
                            <div className="flex flex-wrap gap-1">
                              {product.variants.map(v => (
                                <span
                                  key={v.id}
                                  className={`text-xs px-1.5 py-0.5 rounded ${
                                    (v.inventory_count ?? 0) <= 0
                                      ? 'bg-red-500/10 text-red-500'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {v.name}: {v.inventory_count ?? 0}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <Input
                            type="number"
                            min="0"
                            value={editedQuantities[product.id] ?? String(product.inventory_count ?? 0)}
                            onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                            className={`w-24 ${isChanged ? 'border-blue-500' : ''}`}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {!isClothingWithVariants && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSave(product)}
                            disabled={!isChanged || saving[product.id]}
                          >
                            {saving[product.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
