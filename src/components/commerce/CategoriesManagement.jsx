// src/components/commerce/CategoriesManagement.jsx
// Category management dialog for organizing products, services, etc.

import { useState, useEffect } from 'react'
import useAuthStore from '@/lib/auth-store'
import portalApi from '@/lib/sonor-api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  Plus,
  Folder,
  FolderOpen,
  Edit2,
  Trash2,
  Loader2,
  ChevronRight,
  GripVertical,
  Save,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function CategoriesManagement({ open, onOpenChange, onCategoryChange }) {
  const { currentProject } = useAuthStore()
  const projectId = currentProject?.id

  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [deletingCategory, setDeletingCategory] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', slug: '', description: '' })

  // Load categories
  useEffect(() => {
    if (open && projectId) {
      loadCategories()
    }
  }, [open, projectId])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const response = await portalApi.get(`/commerce/categories/${projectId}`)
      setCategories(response.data || [])
    } catch (error) {
      console.error('Failed to load categories:', error)
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      setSaving(true)
      const slug = newCategory.slug.trim() || generateSlug(newCategory.name)
      
      await portalApi.post(`/commerce/categories/${projectId}`, {
        name: newCategory.name.trim(),
        slug,
        description: newCategory.description.trim() || null,
      })

      toast.success('Category created')
      setShowAddForm(false)
      setNewCategory({ name: '', slug: '', description: '' })
      await loadCategories()
      onCategoryChange?.()
    } catch (error) {
      console.error('Failed to create category:', error)
      toast.error('Failed to create category')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory?.name?.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      setSaving(true)
      await portalApi.put(`/commerce/categories/${editingCategory.id}`, {
        name: editingCategory.name.trim(),
        slug: editingCategory.slug?.trim() || generateSlug(editingCategory.name),
        description: editingCategory.description?.trim() || null,
      })

      toast.success('Category updated')
      setEditingCategory(null)
      await loadCategories()
      onCategoryChange?.()
    } catch (error) {
      console.error('Failed to update category:', error)
      toast.error('Failed to update category')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return

    try {
      setSaving(true)
      await portalApi.delete(`/commerce/categories/${deletingCategory.id}`)

      toast.success('Category deleted')
      setDeletingCategory(null)
      await loadCategories()
      onCategoryChange?.()
    } catch (error) {
      console.error('Failed to delete category:', error)
      toast.error('Failed to delete category')
    } finally {
      setSaving(false)
    }
  }

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  // Count offerings per category (would need to be passed or fetched)
  const getCategoryOfferingCount = (categoryId) => {
    // This would ideally come from the API
    return 0
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Manage Categories
            </DialogTitle>
            <DialogDescription>
              Organize your products, services, and events into categories
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {/* Add Category Form */}
                  {showAddForm ? (
                    <div className="rounded-lg border border-dashed border-[var(--glass-border-strong)] p-4 space-y-3 bg-[var(--glass-bg)]">
                      <div className="space-y-2">
                        <Label htmlFor="new-name">Name</Label>
                        <Input
                          id="new-name"
                          value={newCategory.name}
                          onChange={(e) => setNewCategory({ 
                            ...newCategory, 
                            name: e.target.value,
                            slug: generateSlug(e.target.value)
                          })}
                          placeholder="e.g., Consulting Services"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-slug">URL Slug</Label>
                        <Input
                          id="new-slug"
                          value={newCategory.slug}
                          onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })}
                          placeholder="e.g., consulting-services"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-description">Description (optional)</Label>
                        <Textarea
                          id="new-description"
                          value={newCategory.description}
                          onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                          placeholder="Brief description of this category..."
                          rows={2}
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Button 
                          size="sm" 
                          onClick={handleAddCategory} 
                          disabled={saving}
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save Category
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setShowAddForm(false)
                            setNewCategory({ name: '', slug: '', description: '' })
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full border-dashed"
                      onClick={() => setShowAddForm(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  )}

                  {/* Categories List */}
                  {categories.length === 0 && !showAddForm ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Folder className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No categories yet</p>
                      <p className="text-sm">Create categories to organize your offerings</p>
                    </div>
                  ) : (
                    categories.map((category) => (
                      <div
                        key={category.id}
                        className={cn(
                          "rounded-lg border border-[var(--glass-border)] p-4",
                          "bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] transition-colors"
                        )}
                      >
                        {editingCategory?.id === category.id ? (
                          // Edit mode
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor={`edit-name-${category.id}`}>Name</Label>
                              <Input
                                id={`edit-name-${category.id}`}
                                value={editingCategory.name}
                                onChange={(e) => setEditingCategory({ 
                                  ...editingCategory, 
                                  name: e.target.value 
                                })}
                                autoFocus
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`edit-slug-${category.id}`}>URL Slug</Label>
                              <Input
                                id={`edit-slug-${category.id}`}
                                value={editingCategory.slug}
                                onChange={(e) => setEditingCategory({ 
                                  ...editingCategory, 
                                  slug: e.target.value 
                                })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`edit-desc-${category.id}`}>Description</Label>
                              <Textarea
                                id={`edit-desc-${category.id}`}
                                value={editingCategory.description || ''}
                                onChange={(e) => setEditingCategory({ 
                                  ...editingCategory, 
                                  description: e.target.value 
                                })}
                                rows={2}
                              />
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                              <Button 
                                size="sm" 
                                onClick={handleUpdateCategory} 
                                disabled={saving}
                              >
                                {saving ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Save className="h-4 w-4 mr-2" />
                                )}
                                Save
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => setEditingCategory(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // View mode
                          <div className="flex items-center gap-3">
                            <div className="text-muted-foreground cursor-move">
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <FolderOpen className="h-5 w-5 text-[var(--brand-primary)]" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-[var(--text-primary)]">
                                  {category.name}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  /{category.slug}
                                </Badge>
                              </div>
                              {category.description && (
                                <p className="text-sm text-muted-foreground truncate mt-0.5">
                                  {category.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditingCategory({ ...category })}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeletingCategory(category)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog 
        open={!!deletingCategory} 
        onOpenChange={(open) => !open && setDeletingCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCategory?.name}"? 
              This won't delete the offerings in this category, but they will become uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
