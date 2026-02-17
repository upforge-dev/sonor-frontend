// src/components/commerce/ProductsPanel.jsx
// Products/E-commerce panel - inventory, variants, Shopify sync

import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  Plus,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  Store,
} from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'

export function ProductsPanel({
  products = [],
  lowStockItems = [],
  stats = {},
  shopifyConnected = false,
  compact = false,
  brandColors = {},
  className,
}) {
  const navigate = useNavigate()

  const displayLowStock = lowStockItems.length > 0 ? lowStockItems : []
  const derivedStats = useMemo(() => {
    if (Object.keys(stats).length > 0) return stats
    const totalProducts = products.length
    const activeProducts = products.filter((p) => p.status !== 'archived' && p.status !== 'draft').length
    const totalInventory = products.reduce((sum, p) => sum + (p.stock ?? 0), 0)
    return {
      totalProducts,
      activeProducts,
      totalInventory,
      lowStockCount: displayLowStock.length,
    }
  }, [products, displayLowStock.length, stats])
  const displayProducts = products

  const primary = brandColors.primary || '#4bbf39'
  const rgba = brandColors.rgba || { primary10: 'rgba(75, 191, 57, 0.1)', primary20: 'rgba(75, 191, 57, 0.2)' }

  if (compact) {
    return (
      <Card className={cn("border-l-4", className)} style={{ borderLeftColor: primary }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: rgba.primary10, color: primary }}
              >
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Products</p>
                <p className="text-sm text-muted-foreground">{derivedStats.activeProducts ?? 0} active</p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => navigate('/commerce/offerings?type=product')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {displayLowStock.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-amber-600 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>{displayLowStock.length} items low on stock</span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-l-4", className)} style={{ borderLeftColor: primary }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl"
              style={{ backgroundColor: rgba.primary10, color: primary }}
            >
              <Package className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Products</CardTitle>
              <CardDescription>Physical &amp; digital goods</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {shopifyConnected && (
              <Badge variant="outline" className="gap-1">
                <Store className="h-3 w-3" />
                Shopify
              </Badge>
            )}
            <Button size="sm" onClick={() => navigate('/commerce/offerings/new?type=product')}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3">
          <StatBox label="Total" value={derivedStats.totalProducts ?? 0} />
          <StatBox label="Active" value={derivedStats.activeProducts ?? 0} />
          <StatBox label="Inventory" value={derivedStats.totalInventory ?? 0} />
          <StatBox
            label="Low Stock"
            value={derivedStats.lowStockCount ?? 0}
            alert={(derivedStats.lowStockCount ?? 0) > 0}
          />
        </div>

        {/* Low Stock Alerts */}
        {displayLowStock.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium text-sm">Low Stock Alerts</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                View All
              </Button>
            </div>
            <div className="space-y-2">
              {displayLowStock.slice(0, 3).map(item => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{item.name}</span>
                  <Badge variant="outline" className="text-amber-600 border-amber-300 ml-2">
                    {item.stock} left
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Products */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Recent Products</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link to="/commerce/offerings?type=product">View All</Link>
            </Button>
          </div>
          <div className="space-y-2">
            {displayProducts.slice(0, 4).map((product) => (
              <div 
                key={product.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/commerce/offerings/${product.id}`)}
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  {product.image ? (
                    <img src={product.image} alt="" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Package className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.price != null ? `$${product.price}` : ''}
                    {product.price != null && (product.digital || product.stock != null) ? ' • ' : ''}
                    {product.digital ? 'Digital' : product.stock != null ? `${product.stock} in stock` : ''}
                  </p>
                </div>
              </div>
            ))}
            {displayProducts.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">No products yet</div>
            )}
          </div>
        </div>

        {/* Shopify Sync Status */}
        {shopifyConnected && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Last synced 2 hours ago</span>
            </div>
            <Button variant="ghost" size="sm" className="h-7">
              <RefreshCw className="h-3 w-3 mr-1" />
              Sync
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatBox({ label, value, alert = false }) {
  return (
    <div className={cn(
      "p-2 rounded-lg text-center",
      alert ? "bg-amber-50 dark:bg-amber-900/10" : "bg-muted/50"
    )}>
      <p className={cn(
        "text-lg font-bold",
        alert && "text-amber-600"
      )}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

export default ProductsPanel
