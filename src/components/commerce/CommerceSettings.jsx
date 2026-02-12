/**
 * CommerceSettings - Payment processor configuration (single either/or choice) + Tax settings
 */
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Loader2, AlertCircle, CreditCard, Zap, Percent, Save, Settings2, ArrowRight } from 'lucide-react'
import { portalApi } from '@/lib/portal-api'
import SquareSetupDialog from './SquareSetupDialog'
import StripeSetupDialog from './StripeSetupDialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ============================================================================
// Payment Processor Selector Modal (either/or)
// ============================================================================
function ProcessorSelectModal({ open, onOpenChange, settings, projectId, onProcessorConnected }) {
  const [squareDialogOpen, setSquareDialogOpen] = useState(false)
  const [stripeDialogOpen, setStripeDialogOpen] = useState(false)
  const [disconnecting, setDisconnecting] = useState(null)

  const activeProcessor = settings?.active_processor || null
  const squareConnected = !!settings?.square_connected
  const stripeConnected = !!settings?.stripe_connected

  const handleDisconnect = async (processor) => {
    if (!confirm(`Disconnect ${processor === 'stripe' ? 'Stripe' : 'Square'}? This will remove the payment processor from your project.`)) return
    try {
      setDisconnecting(processor)
      await portalApi.get(`/commerce/oauth/${processor}/disconnect/${projectId}`)
      toast.success(`${processor === 'stripe' ? 'Stripe' : 'Square'} disconnected`)
      onProcessorConnected()
    } catch (error) {
      console.error(`Failed to disconnect ${processor}:`, error)
      toast.error(`Failed to disconnect ${processor}`)
    } finally {
      setDisconnecting(null)
    }
  }

  const handleSelectProcessor = (processor) => {
    // If the other processor is connected, we need to disconnect it first
    if (processor === 'stripe' && squareConnected) {
      if (!confirm('Switching to Stripe will disconnect Square. Continue?')) return
      handleDisconnect('square').then(() => setStripeDialogOpen(true))
      return
    }
    if (processor === 'square' && stripeConnected) {
      if (!confirm('Switching to Square will disconnect Stripe. Continue?')) return
      handleDisconnect('stripe').then(() => setSquareDialogOpen(true))
      return
    }

    // Open the appropriate OAuth dialog
    if (processor === 'stripe') setStripeDialogOpen(true)
    else setSquareDialogOpen(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Processor</DialogTitle>
            <DialogDescription>
              Choose a payment processor for your project. Only one can be active at a time.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            {/* Stripe Option */}
            <button
              onClick={() => stripeConnected ? null : handleSelectProcessor('stripe')}
              className={cn(
                'relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all text-left',
                stripeConnected
                  ? 'border-[#635BFF] bg-[#635BFF]/5'
                  : 'border-[var(--glass-border)] hover:border-[#635BFF]/50 hover:bg-[#635BFF]/5'
              )}
            >
              {stripeConnected && (
                <Badge className="absolute top-2 right-2 bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">
                  <CheckCircle className="w-3 h-3 mr-0.5" />
                  Active
                </Badge>
              )}
              <div className="p-3 bg-[#635BFF] rounded-xl">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Stripe</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cards, subscriptions, ACH
                </p>
              </div>
              {stripeConnected && (
                <p className="text-[10px] font-mono text-muted-foreground truncate max-w-full">
                  {settings.stripe_account_id}
                </p>
              )}
            </button>

            {/* Square Option */}
            <button
              onClick={() => squareConnected ? null : handleSelectProcessor('square')}
              className={cn(
                'relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all text-left',
                squareConnected
                  ? 'border-[#3E4348] bg-[#3E4348]/5'
                  : 'border-[var(--glass-border)] hover:border-[#3E4348]/50 hover:bg-[#3E4348]/5'
              )}
            >
              {squareConnected && (
                <Badge className="absolute top-2 right-2 bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">
                  <CheckCircle className="w-3 h-3 mr-0.5" />
                  Active
                </Badge>
              )}
              <div className="p-3 bg-[#3E4348] rounded-xl">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Square</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  In-person & online payments
                </p>
              </div>
              {squareConnected && (
                <p className="text-[10px] font-mono text-muted-foreground truncate max-w-full">
                  {settings.square_merchant_id}
                </p>
              )}
            </button>
          </div>

          {/* Disconnect active processor */}
          {(stripeConnected || squareConnected) && (
            <div className="border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => handleDisconnect(stripeConnected ? 'stripe' : 'square')}
                disabled={!!disconnecting}
              >
                {disconnecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  `Disconnect ${stripeConnected ? 'Stripe' : 'Square'}`
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* OAuth Dialogs */}
      <SquareSetupDialog
        open={squareDialogOpen}
        onOpenChange={setSquareDialogOpen}
        projectId={projectId}
        onSuccess={() => {
          setSquareDialogOpen(false)
          onProcessorConnected()
          onOpenChange(false)
        }}
      />
      <StripeSetupDialog
        open={stripeDialogOpen}
        onOpenChange={setStripeDialogOpen}
        projectId={projectId}
        onSuccess={() => {
          setStripeDialogOpen(false)
          onProcessorConnected()
          onOpenChange(false)
        }}
      />
    </>
  )
}

// ============================================================================
// Main Commerce Settings
// ============================================================================
export default function CommerceSettings({ projectId, open, onOpenChange }) {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processorModalOpen, setProcessorModalOpen] = useState(false)
  
  // Tax settings state
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [taxRate, setTaxRate] = useState('')
  const [taxName, setTaxName] = useState('Sales Tax')
  const [savingTax, setSavingTax] = useState(false)

  useEffect(() => {
    if (projectId) {
      loadSettings()
    }
  }, [projectId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await portalApi.get(`/commerce/settings/${projectId}`)
      setSettings(response.data)
      setTaxEnabled(response.data?.tax_enabled || false)
      setTaxRate(response.data?.tax_rate?.toString() || '')
      setTaxName(response.data?.tax_name || 'Sales Tax')
    } catch (error) {
      console.error('Failed to load commerce settings:', error)
      toast.error('Failed to load payment settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTaxSettings = async () => {
    try {
      setSavingTax(true)
      await portalApi.put(`/commerce/settings/${projectId}`, {
        tax_enabled: taxEnabled,
        tax_rate: taxRate ? parseFloat(taxRate) : null,
        tax_name: taxName || 'Sales Tax',
      })
      toast.success('Tax settings saved')
    } catch (error) {
      console.error('Failed to save tax settings:', error)
      toast.error('Failed to save tax settings')
    } finally {
      setSavingTax(false)
    }
  }

  // Derive active processor state
  const stripeConnected = !!settings?.stripe_connected
  const squareConnected = !!settings?.square_connected
  const hasProcessor = stripeConnected || squareConnected
  const processorName = stripeConnected ? 'Stripe' : squareConnected ? 'Square' : null
  const processorIcon = stripeConnected ? Zap : CreditCard
  const ProcessorIcon = processorIcon

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Commerce Settings</DialogTitle>
          <DialogDescription>
            Configure your payment processor and tax settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Processor — single either/or card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center gap-3">
                {hasProcessor ? (
                  <div className={cn(
                    'p-2 rounded-lg',
                    stripeConnected ? 'bg-[#635BFF]' : 'bg-[#3E4348]'
                  )}>
                    <ProcessorIcon className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className="p-2 bg-muted rounded-lg">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-base">Payment Processor</CardTitle>
                  <CardDescription>
                    {hasProcessor
                      ? `${processorName} is active`
                      : 'No payment processor connected'
                    }
                  </CardDescription>
                </div>
              </div>
              {hasProcessor && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {hasProcessor ? (
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="text-muted-foreground">
                      {stripeConnected ? 'Account ID' : 'Merchant ID'}
                    </div>
                    <div className="font-mono text-xs mt-1">
                      {stripeConnected
                        ? settings.stripe_account_id || 'N/A'
                        : settings.square_merchant_id || 'N/A'
                      }
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProcessorModalOpen(true)}
                    className="w-full"
                  >
                    <Settings2 className="w-4 h-4 mr-2" />
                    Change Payment Processor
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Connect a payment processor to accept payments for your products and events.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={() => setProcessorModalOpen(true)} className="w-full">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Set Up Payment Processor
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tax Settings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Percent className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Tax Settings</CardTitle>
                  <CardDescription>
                    Configure sales tax for your transactions
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="tax-enabled">Enable Tax</Label>
                  <p className="text-xs text-muted-foreground">Add tax to sales</p>
                </div>
                <Switch
                  id="tax-enabled"
                  checked={taxEnabled}
                  onCheckedChange={setTaxEnabled}
                />
              </div>
              
              {taxEnabled && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tax-name">Tax Name</Label>
                      <Input
                        id="tax-name"
                        value={taxName}
                        onChange={(e) => setTaxName(e.target.value)}
                        placeholder="Sales Tax"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                      <Input
                        id="tax-rate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                        placeholder="8.25"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This tax rate will be applied to all sales unless overridden at checkout.
                  </p>
                </div>
              )}
              
              <Button
                onClick={handleSaveTaxSettings}
                disabled={savingTax}
                className="w-full"
              >
                {savingTax ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Tax Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>

      {/* Processor Selection Modal */}
      <ProcessorSelectModal
        open={processorModalOpen}
        onOpenChange={setProcessorModalOpen}
        settings={settings}
        projectId={projectId}
        onProcessorConnected={loadSettings}
      />
    </Dialog>
  )
}
