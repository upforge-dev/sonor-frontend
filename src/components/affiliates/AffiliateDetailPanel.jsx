// src/components/affiliates/AffiliateDetailPanel.jsx
// Right panel showing affiliate details with tabs
// MIGRATED TO REACT QUERY HOOKS - Jan 29, 2026

import { useState } from 'react'
import {
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  MousePointerClick,
  CheckCircle,
  DollarSign,
  Link2,
  Plus,
  Upload,
  Globe,
  Play,
  Pause,
  MoreVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/EmptyState'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import useAuthStore from '@/lib/auth-store'
import { 
  useAffiliate, 
  useAffiliateOffers, 
  useAffiliateClicks, 
  useAffiliateConversions,
  useUpdateAffiliate,
  useDeleteAffiliate,
  affiliatesKeys 
} from '@/lib/hooks/use-affiliates'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import CreateConversionDialog from './CreateConversionDialog'
import EditAffiliateDialog from './EditAffiliateDialog'

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({ affiliate }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0)
  }

  const stats = [
    { 
      label: 'Total Clicks', 
      value: affiliate.total_clicks || 0, 
      icon: MousePointerClick,
      color: 'text-blue-500'
    },
    { 
      label: 'Conversions', 
      value: affiliate.total_conversions || 0, 
      icon: CheckCircle,
      color: 'text-green-500'
    },
    { 
      label: 'Total Payout', 
      value: formatCurrency(affiliate.total_payout), 
      icon: DollarSign,
      color: 'text-amber-500',
      isAmount: true
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(stat => (
          <div 
            key={stat.label}
            className="bg-muted/50 rounded-xl p-4 text-center"
          >
            <stat.icon className={cn("h-5 w-5 mx-auto mb-2", stat.color)} />
            <div className="text-2xl font-bold">
              {stat.isAmount ? stat.value : stat.value.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Logo */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Logo</label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
            {affiliate.logo_url ? (
              <img 
                src={affiliate.logo_url} 
                alt={affiliate.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Globe className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {affiliate.logo_url ? (
              <p>Logo loaded from website</p>
            ) : (
              <p>No logo available</p>
            )}
            <Button variant="outline" size="sm" className="mt-2">
              <Upload className="h-4 w-4 mr-1" />
              Upload Custom
            </Button>
          </div>
        </div>
      </div>

      {/* Website */}
      {affiliate.website_url && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Website</label>
          <a 
            href={affiliate.website_url.startsWith('http') ? affiliate.website_url : `https://${affiliate.website_url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            {affiliate.website_url}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Notes</label>
        <div className="bg-muted/50 rounded-lg p-4 min-h-[100px]">
          {affiliate.notes || (
            <span className="text-muted-foreground italic">No notes added</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// OFFERS TAB
// ============================================================================

function OffersTab({ affiliate, offers }) {
  const { currentProject } = useAuthStore()
  const apiBaseUrl = (import.meta.env.VITE_SONOR_API_URL || import.meta.env.VITE_PORTAL_API_URL) || 'https://api.sonor.io'

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Tracking link copied!')
  }

  return (
    <div className="p-6">
      {offers.length === 0 ? (
        <EmptyState.Card
          icon={Link2}
          title="No offers created yet"
          description="Create an offer to generate tracking links"
          actionLabel={onCreateOffer != null ? 'Create Offer' : undefined}
          onAction={onCreateOffer}
        />
      ) : (
        <div className="space-y-4">
          {offers.filter(o => o.is_active).map(offer => {
            const trackingUrl = `${apiBaseUrl}/a/${affiliate.id}/${offer.id}`
            
            return (
              <div 
                key={offer.id}
                className="bg-muted/50 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{offer.name}</h4>
                    {offer.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {offer.description}
                      </p>
                    )}
                  </div>
                  {offer.payout_type === 'flat' && offer.payout_amount && (
                    <Badge variant="secondary">
                      ${offer.payout_amount} per conversion
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-background rounded-lg px-3 py-2 font-mono text-xs truncate">
                    {trackingUrl}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(trackingUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(offer.destination_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Destination: {offer.destination_url}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// CONVERSIONS TAB
// ============================================================================

function ConversionsTab({ affiliate }) {
  const { currentProject } = useAuthStore()
  // React Query hook auto-fetches when projectId and affiliateId are available
  const { data: conversions = [] } = useAffiliateConversions(currentProject?.id, affiliate?.id)

  const affiliateConversions = conversions.filter(c => c.affiliate_id === affiliate.id)

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatCurrency = (amount) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Conversion History</h3>
        <CreateConversionDialog affiliateId={affiliate.id}>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Conversion
          </Button>
        </CreateConversionDialog>
      </div>

      {affiliateConversions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No conversions recorded</p>
          <p className="text-sm mt-1">Manually add conversions as they occur</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Date</th>
                <th className="text-right px-4 py-2 font-medium">Value</th>
                <th className="text-right px-4 py-2 font-medium">Payout</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {affiliateConversions.map(conversion => (
                <tr key={conversion.id} className="border-t">
                  <td className="px-4 py-3">{formatDate(conversion.conversion_date)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(conversion.conversion_value)}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">
                    {formatCurrency(conversion.payout_amount)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge 
                      variant={conversion.status === 'approved' ? 'default' : 'secondary'}
                    >
                      {conversion.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN PANEL
// ============================================================================

export default function AffiliateDetailPanel({ affiliate, offers }) {
  const { currentProject } = useAuthStore()
  const queryClient = useQueryClient()
  
  // React Query mutations
  const updateAffiliateMutation = useUpdateAffiliate()
  const deleteAffiliateMutation = useDeleteAffiliate()
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleToggleStatus = async () => {
    const newStatus = affiliate.status === 'active' ? 'paused' : 'active'
    try {
      await updateAffiliateMutation.mutateAsync({ 
        affiliateId: affiliate.id, 
        updates: { status: newStatus } 
      })
      toast.success(`Affiliate ${newStatus === 'active' ? 'activated' : 'paused'}`)
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteAffiliateMutation.mutateAsync(affiliate.id)
      toast.success('Affiliate deleted')
      setShowDeleteDialog(false)
    } catch (error) {
      toast.error('Failed to delete affiliate')
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-[var(--glass-border)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {affiliate.logo_url ? (
                <img 
                  src={affiliate.logo_url} 
                  alt={affiliate.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Globe className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold truncate">{affiliate.name}</h2>
              <div className="flex items-center gap-2 mt-1 min-w-0">
                <Badge variant={affiliate.status === 'active' ? 'default' : 'secondary'} className="shrink-0">
                  {affiliate.status}
                </Badge>
                {affiliate.website_url && (
                  <span className="text-sm text-muted-foreground truncate">
                    {affiliate.website_url.replace(/^https?:\/\//, '')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <EditAffiliateDialog affiliate={affiliate}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              </EditAffiliateDialog>
              <DropdownMenuItem onClick={handleToggleStatus}>
                {affiliate.status === 'active' ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col">
        <TabsList className="mx-6 mt-4 justify-start bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="offers">Offers & Links</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="overview" className="mt-0">
            <OverviewTab affiliate={affiliate} />
          </TabsContent>
          <TabsContent value="offers" className="mt-0">
            <OffersTab affiliate={affiliate} offers={offers} />
          </TabsContent>
          <TabsContent value="conversions" className="mt-0">
            <ConversionsTab affiliate={affiliate} />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Affiliate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {affiliate.name} and all associated click data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
