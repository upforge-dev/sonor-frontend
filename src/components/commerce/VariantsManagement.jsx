// src/components/commerce/VariantsManagement.jsx
// Full CRUD dialog for managing product variants
// MIGRATED TO REACT QUERY HOOKS - Jan 29, 2026

import { useState, useEffect } from 'react'
import { useCommerceVariants, useCreateCommerceVariant, useUpdateCommerceVariant, useDeleteCommerceVariant, commerceKeys } from '@/lib/hooks'
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
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Package,
  DollarSign,
  Hash,
  Loader2,
  GripVertical,
  Star,
  AlertTriangle,
} from 'lucide-react'
import { toast } from '@/lib/toast'

export default function VariantsManagement({
  open,
  onOpenChange,
  offeringId,
  offeringName,
  basePrice,
  trackInventory,
  onVariantChange,
}) {
  const { data: variantsData, isLoading: loading, error: variantsError, refetch } = useCommerceVariants(offeringId, {
    enabled: open && !!offeringId,
  })
  const variants = variantsData ?? []

  // Edit/Create dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState(null)
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [variantToDelete, setVariantToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Form state for create/edit
  const [form, setForm] = useState({
    name: '',
    sku: '',
    price: '',
    inventory_count: '0',
    options: {},
    is_default: false,
  })

  const error = variantsError ? (variantsError.message || 'Failed to load variants') : null
  const loadVariants = () => refetch()

  const resetForm = () => {
    setForm({
      name: '',
      sku: '',
      price: '',
      inventory_count: '0',
      options: {},
      is_default: false,
    })
  }

  const openCreateDialog = () => {
    resetForm()
    setEditingVariant(null)
    setEditDialogOpen(true)
  }

  const openEditDialog = (variant) => {
    setForm({
      name: variant.name || '',
      sku: variant.sku || '',
      price: variant.price?.toString() || '',
      inventory_count: variant.inventory_count?.toString() || '0',
      options: variant.options || {},
      is_default: variant.is_default || false,
    })
    setEditingVariant(variant)
    setEditDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Variant name is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        price: form.price ? parseFloat(form.price) : null,
        inventory_count: parseInt(form.inventory_count) || 0,
        options: form.options,
        is_default: form.is_default,
      }

      if (editingVariant) {
        await updateVariant(editingVariant.id, payload)
        toast.success('Variant updated')
      } else {
        await createVariant(offeringId, payload)
        toast.success('Variant created')
      }

      setEditDialogOpen(false)
      resetForm()
      loadVariants()
      onVariantChange?.()
    } catch (err) {
      console.error('Failed to save variant:', err)
      toast.error(err.response?.data?.message || 'Failed to save variant')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = (variant) => {
    setVariantToDelete(variant)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!variantToDelete) return

    setDeleting(true)
    try {
      await deleteVariant(variantToDelete.id)
      toast.success('Variant deleted')
      setDeleteDialogOpen(false)
      setVariantToDelete(null)
      loadVariants()
      onVariantChange?.()
    } catch (err) {
      console.error('Failed to delete variant:', err)
      toast.error(err.response?.data?.message || 'Failed to delete variant')
    } finally {
      setDeleting(false)
    }
  }

  const setAsDefault = async (variant) => {
    try {
      // Update all variants to not be default, then set this one as default
      for (const v of variants) {
        if (v.is_default && v.id !== variant.id) {
          await updateVariant(v.id, { is_default: false })
        }
      }
      await updateVariant(variant.id, { is_default: true })
      toast.success(`${variant.name} set as default variant`)
      loadVariants()
    } catch (err) {
      console.error('Failed to set default variant:', err)
      toast.error('Failed to update default variant')
    }
  }

  // Option management helpers
  const addOption = () => {
    const optionKey = `Option ${Object.keys(form.options).length + 1}`
    setForm(prev => ({
      ...prev,
      options: { ...prev.options, [optionKey]: '' }
    }))
  }

  const updateOptionKey = (oldKey, newKey) => {
    const newOptions = { ...form.options }
    const value = newOptions[oldKey]
    delete newOptions[oldKey]
    newOptions[newKey] = value
    setForm(prev => ({ ...prev, options: newOptions }))
  }

  const updateOptionValue = (key, value) => {
    setForm(prev => ({
      ...prev,
      options: { ...prev.options, [key]: value }
    }))
  }

  const removeOption = (key) => {
    const newOptions = { ...form.options }
    delete newOptions[key]
    setForm(prev => ({ ...prev, options: newOptions }))
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Manage Variants
            </DialogTitle>
            <DialogDescription>
              Add size, color, or other variations for {offeringName}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardContent className="py-6 text-center">
                <AlertTriangle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <Button variant="outline" className="mt-4" onClick={loadVariants}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : variants.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No variants yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add variants for different sizes, colors, or options
                </p>
                <Button className="mt-4" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Variant
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-end mb-4">
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variant
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    {trackInventory && (
                      <TableHead className="text-right">Stock</TableHead>
                    )}
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((variant) => (
                    <TableRow key={variant.id}>
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{variant.name}</span>
                          {variant.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                        {Object.keys(variant.options || {}).length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {Object.entries(variant.options || {}).map(([key, value]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {key}: {value}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {variant.sku || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {variant.price != null ? (
                          <span className="font-medium">${variant.price.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">
                            ${basePrice?.toFixed(2) || '—'}
                          </span>
                        )}
                      </TableCell>
                      {trackInventory && (
                        <TableCell className="text-right">
                          <Badge 
                            variant={
                              variant.inventory_count <= 0 
                                ? 'destructive' 
                                : variant.inventory_count <= 5 
                                  ? 'secondary' 
                                  : 'outline'
                            }
                          >
                            {variant.inventory_count}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(variant)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {!variant.is_default && (
                              <DropdownMenuItem onClick={() => setAsDefault(variant)}>
                                <Star className="h-4 w-4 mr-2" />
                                Set as Default
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => confirmDelete(variant)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVariant ? 'Edit Variant' : 'Add Variant'}
            </DialogTitle>
            <DialogDescription>
              {editingVariant 
                ? `Update details for ${editingVariant.name}`
                : 'Create a new variant for this product'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="variant-name">Variant Name *</Label>
              <Input
                id="variant-name"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Small, Red, 16oz"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="variant-sku">SKU</Label>
                <Input
                  id="variant-sku"
                  value={form.sku}
                  onChange={(e) => setForm(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="Optional SKU"
                />
              </div>
              <div>
                <Label htmlFor="variant-price">Price Override</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="variant-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                    className="pl-8"
                    placeholder={basePrice?.toString() || '0.00'}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to use base price (${basePrice?.toFixed(2) || '0.00'})
                </p>
              </div>
            </div>

            {trackInventory && (
              <div>
                <Label htmlFor="variant-stock">Stock Quantity</Label>
                <Input
                  id="variant-stock"
                  type="number"
                  min="0"
                  value={form.inventory_count}
                  onChange={(e) => setForm(prev => ({ ...prev, inventory_count: e.target.value }))}
                />
              </div>
            )}

            {/* Options Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Options (Size, Color, etc.)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Option
                </Button>
              </div>
              
              {Object.entries(form.options).length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No options defined. Add options like Size, Color, Material.
                </p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(form.options).map(([key, value], index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={key}
                        onChange={(e) => updateOptionKey(key, e.target.value)}
                        placeholder="Option name"
                        className="w-1/3"
                      />
                      <Input
                        value={value}
                        onChange={(e) => updateOptionValue(key, e.target.value)}
                        placeholder="Option value"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(key)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is-default"
                checked={form.is_default}
                onCheckedChange={(checked) => setForm(prev => ({ ...prev, is_default: checked }))}
              />
              <Label htmlFor="is-default">Set as default variant</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingVariant ? 'Save Changes' : 'Create Variant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Variant?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{variantToDelete?.name}&quot;? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
