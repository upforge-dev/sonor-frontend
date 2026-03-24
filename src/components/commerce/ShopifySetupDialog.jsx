/**
 * ShopifySetupDialog - Configure Shopify store connection
 * 
 * Shopify uses a store URL + access token setup (not OAuth like Square/Stripe)
 */
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, ExternalLink, ShoppingBag, CheckCircle } from 'lucide-react'
import { portalApi } from '@/lib/sonor-api'
import { toast } from 'sonner'

export default function ShopifySetupDialog({ open, onOpenChange, projectId, onSuccess }) {
  const [storeUrl, setStoreUrl] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)
  const [step, setStep] = useState(1) // 1 = enter store, 2 = enter token

  const handleConnect = async () => {
    setError(null)
    
    // Validate inputs
    if (!storeUrl.trim()) {
      setError('Please enter your Shopify store URL')
      return
    }
    if (!accessToken.trim()) {
      setError('Please enter your Shopify access token')
      return
    }
    
    setIsConnecting(true)
    
    try {
      // Clean up store URL - extract just the myshopify.com subdomain
      let cleanedUrl = storeUrl.trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '')
      
      // If they entered just the subdomain, add .myshopify.com
      if (!cleanedUrl.includes('.')) {
        cleanedUrl = `${cleanedUrl}.myshopify.com`
      }
      
      await portalApi.post(`/commerce/shopify/connect/${projectId}`, {
        store_url: cleanedUrl,
        access_token: accessToken.trim(),
      })
      
      toast.success('Shopify connected successfully!')
      onSuccess?.()
      onOpenChange(false)
      
      // Reset form
      setStoreUrl('')
      setAccessToken('')
      setStep(1)
    } catch (error) {
      console.error('Failed to connect Shopify:', error)
      setError(error.response?.data?.message || 'Failed to connect Shopify. Please check your credentials.')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleClose = () => {
    setStoreUrl('')
    setAccessToken('')
    setStep(1)
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#95BF47] rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle>Connect Shopify</DialogTitle>
              <DialogDescription>
                Sync your products and inventory from Shopify
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="store-url">Shopify Store URL</Label>
                <Input
                  id="store-url"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="your-store.myshopify.com"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your Shopify store URL (e.g., your-store.myshopify.com)
                </p>
              </div>
              
              <Button 
                onClick={() => setStep(2)} 
                className="w-full"
                disabled={!storeUrl.trim()}
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Store: {storeUrl}
                </p>
                <button 
                  onClick={() => setStep(1)}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Change store
                </button>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="access-token">Admin API Access Token</Label>
                <Input
                  id="access-token"
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="shpat_..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Create a private app in Shopify Admin → Settings → Apps and sales channels → Develop apps
                </p>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Required permissions:</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>read_products, write_products</li>
                  <li>read_inventory, write_inventory</li>
                  <li>read_orders</li>
                </ul>
              </div>

              <a 
                href="https://help.shopify.com/en/manual/apps/custom-apps" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                How to create a Shopify private app
              </a>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isConnecting}
          >
            Cancel
          </Button>
          {step === 2 && (
            <Button
              onClick={handleConnect}
              disabled={isConnecting || !accessToken.trim()}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Connect Shopify
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
