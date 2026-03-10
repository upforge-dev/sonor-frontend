// src/components/commerce/ClothingSizesModal.jsx
// Clothing-specific size management: preset sizes + per-size stock.
// Uses same commerce_variants API; variants stored as name + options: { Size: "M" } for storefront.

import { useState } from 'react'
import {
  useCommerceVariants,
  useCreateCommerceVariant,
  useUpdateCommerceVariant,
  useDeleteCommerceVariant,
} from '@/lib/hooks'
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
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Shirt, Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from '@/lib/toast'

const PRESET_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']

function getSizeName(variant) {
  return variant?.options?.Size ?? variant?.name ?? ''
}

export default function ClothingSizesModal({
  open,
  onOpenChange,
  offeringId,
  offeringName,
  trackInventory,
  onVariantChange,
}) {
  const { data: variantsData, isLoading, error, refetch } = useCommerceVariants(offeringId, {
    enabled: open && !!offeringId,
  })
  const variants = variantsData ?? []
  const createVariant = useCreateCommerceVariant()
  const updateVariant = useUpdateCommerceVariant()
  const deleteVariant = useDeleteCommerceVariant()

  const [customSize, setCustomSize] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const existingSizes = new Set(variants.map((v) => getSizeName(v).toUpperCase()))

  const handleAddPreset = async (size) => {
    if (!offeringId || existingSizes.has(size.toUpperCase())) return
    try {
      await createVariant.mutateAsync({
        offeringId,
        data: {
          name: size,
          options: { Size: size },
          inventory_count: 0,
          track_inventory: !!trackInventory,
          is_default: variants.length === 0,
        },
      })
      toast.success(`Size ${size} added`)
      refetch()
      onVariantChange?.()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to add size')
    }
  }

  const handleAddCustom = async () => {
    const size = customSize.trim()
    if (!size || !offeringId) return
    if (existingSizes.has(size.toUpperCase())) {
      toast.error('That size already exists')
      return
    }
    try {
      await createVariant.mutateAsync({
        offeringId,
        data: {
          name: size,
          options: { Size: size },
          inventory_count: 0,
          track_inventory: !!trackInventory,
          is_default: variants.length === 0,
        },
      })
      toast.success(`Size ${size} added`)
      setCustomSize('')
      refetch()
      onVariantChange?.()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to add size')
    }
  }

  const handleUpdateInventory = async (variant, value) => {
    const num = parseInt(value, 10)
    if (isNaN(num) || num < 0) return
    try {
      await updateVariant.mutateAsync({
        variantId: variant.id,
        data: { inventory_count: num },
        offeringId,
      })
      refetch()
      onVariantChange?.()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to update stock')
    }
  }

  const handleDelete = (variant) => setDeleteConfirm(variant)

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    setDeletingId(deleteConfirm.id)
    try {
      await deleteVariant.mutateAsync({ variantId: deleteConfirm.id, offeringId })
      toast.success(`Size ${getSizeName(deleteConfirm)} removed`)
      setDeleteConfirm(null)
      refetch()
      onVariantChange?.()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to remove size')
    } finally {
      setDeletingId(null)
    }
  }

  const errorMessage = error ? (error.message || 'Failed to load sizes') : null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shirt className="h-5 w-5" />
              Manage sizes
            </DialogTitle>
            <DialogDescription>
              Add clothing sizes for {offeringName}. Customers will choose a size when adding to cart.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : errorMessage ? (
            <div className="py-6 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-2" />
              <p className="text-destructive text-sm">{errorMessage}</p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Preset sizes */}
              <div>
                <Label className="text-sm text-muted-foreground">Add standard sizes</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PRESET_SIZES.map((size) => {
                    const added = existingSizes.has(size.toUpperCase())
                    return (
                      <Button
                        key={size}
                        type="button"
                        variant={added ? 'secondary' : 'outline'}
                        size="sm"
                        disabled={added}
                        onClick={() => handleAddPreset(size)}
                      >
                        {added ? `${size} ✓` : size}
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* Custom size */}
              <div className="flex gap-2">
                <Input
                  placeholder="Custom size (e.g. 28, 30, One Size)"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustom())}
                />
                <Button type="button" variant="secondary" onClick={handleAddCustom} disabled={!customSize.trim()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>

              {/* List of sizes with stock */}
              {variants.length > 0 && (
                <div>
                  <Label className="text-sm text-muted-foreground">Sizes & stock</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Size</TableHead>
                        {trackInventory && <TableHead className="text-right w-28">Stock</TableHead>}
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variants.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{getSizeName(v)}</TableCell>
                          {trackInventory && (
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min={0}
                                className="h-8 w-20 text-right"
                                defaultValue={v.inventory_count ?? 0}
                                onBlur={(e) => handleUpdateInventory(v, e.target.value)}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(v)}
                              disabled={deletingId === v.id}
                            >
                              {deletingId === v.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {variants.length === 0 && !errorMessage && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Add sizes using the buttons above. Stock can be set per size once added.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove size?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove size {deleteConfirm ? getSizeName(deleteConfirm) : ''}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
