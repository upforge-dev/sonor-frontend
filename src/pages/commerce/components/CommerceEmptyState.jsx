// src/pages/commerce/components/CommerceEmptyState.jsx
// Empty state component for products, services, and events

import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Package,
  Plus,
  RefreshCw,
  Store,
  Zap,
  Calendar,
  Sparkles,
} from 'lucide-react'

// Empty State - Mode-aware, Glass style (supports products, services, and events)
export function EmptyState({ filter, type = 'product', brandColors, isShopifyMode, hasPaymentProcessor, onOpenSignalDialog, onStartCreating, onSyncShopify }) {
  const isFiltered = filter !== 'all'
  const isService = type === 'service'
  const isEvent = type === 'event'
  const Icon = isEvent ? Calendar : isService ? Zap : Package
  
  // Different messaging based on integration mode and type
  const getMessage = () => {
    if (isFiltered) {
      return `Try adjusting your filters or search query.`
    }
    if (isEvent) {
      if (hasPaymentProcessor) {
        return 'Create your first event. Add details, set ticket prices (or make it free), and start accepting registrations.'
      }
      return 'Connect a payment processor to start selling tickets, or create free events now.'
    }
    if (isService) {
      if (hasPaymentProcessor) {
        return 'Define your first service offering. Add pricing details and descriptions that can be used in contracts and invoices.'
      }
      return 'Connect a payment processor to start accepting payments for your services.'
    }
    if (isShopifyMode) {
      return 'No products synced from Shopify yet. Make sure your Shopify store has published products.'
    }
    if (hasPaymentProcessor) {
      return 'Start building your catalog by adding your first product. Payments will be processed through your connected payment provider.'
    }
    return 'Connect Shopify to sync your product catalog, or connect Stripe/Square to add products manually.'
  }
  
  const getTitle = () => {
    const typeLabel = isEvent ? 'events' : isService ? 'services' : 'products'
    return isFiltered ? `No matching ${typeLabel}` : `No ${typeLabel} yet`
  }
  
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div 
        className="h-16 w-16 rounded-2xl bg-[var(--brand-primary)]/10 flex items-center justify-center mb-4"
      >
        <Icon className="h-8 w-8 text-[var(--brand-primary)]" />
      </div>
      <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
        {getTitle()}
      </h3>
      <p className="text-[var(--text-secondary)] mb-6 max-w-sm">
        {getMessage()}
      </p>
      {!isFiltered && (
        <div className="flex flex-wrap gap-3 justify-center">
          {isEvent ? (
            // Event-specific buttons
            <>
              <Button 
                style={{ backgroundColor: brandColors?.primary || '#4bbf39' }}
                onClick={() => onStartCreating?.('event')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
              {!hasPaymentProcessor && (
                <Link to="/settings/integrations">
                  <Button variant="outline">
                    <Zap className="h-4 w-4 mr-2" />
                    Connect Payment Provider
                  </Button>
                </Link>
              )}
            </>
          ) : isService ? (
            // Service-specific buttons
            <>
              <Button 
                style={{ backgroundColor: brandColors?.primary || '#4bbf39' }}
                onClick={() => onStartCreating?.('service')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
              <Button 
                variant="outline"
                onClick={() => onOpenSignalDialog?.()}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Create with Signal
              </Button>
              {!hasPaymentProcessor && (
                <Link to="/settings/integrations">
                  <Button variant="outline">
                    <Zap className="h-4 w-4 mr-2" />
                    Connect Payment Provider
                  </Button>
                </Link>
              )}
            </>
          ) : (
            // Product-specific buttons
            <>
              {/* Show Add Product only if not in Shopify mode (manual products) */}
              {!isShopifyMode && (
                <Button 
                  style={{ backgroundColor: brandColors?.primary || '#4bbf39' }}
                  onClick={() => onStartCreating?.('product')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              )}
              
              {/* Show Shopify sync button if in Shopify mode */}
              {isShopifyMode && (
                <Button 
                  style={{ backgroundColor: brandColors?.primary || '#4bbf39' }}
                  onClick={() => onSyncShopify?.()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync from Shopify
                </Button>
              )}
              
              {/* Always show setup button if no payment processor */}
              {!hasPaymentProcessor && !isShopifyMode && (
                <Link to="/settings/integrations">
                  <Button variant="outline">
                    <Zap className="h-4 w-4 mr-2" />
                    Connect Payment Provider
                  </Button>
                </Link>
              )}
              
              {/* Show Shopify connect if not connected */}
              {!isShopifyMode && (
                <Link to="/settings/integrations">
                  <Button variant="outline">
                    <Store className="h-4 w-4 mr-2" />
                    Connect Shopify
                  </Button>
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
