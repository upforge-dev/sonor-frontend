// src/pages/commerce/CustomerDetail.jsx
// View customer details and purchase history
// MIGRATED TO REACT QUERY HOOKS - Jan 29, 2026

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCustomer, useCustomerPurchases, useUpdateCustomer, useAddCustomerTag } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import useAuthStore from '@/lib/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Mail,
  Phone,
  DollarSign,
  ShoppingCart,
  Tag,
  MessageSquare,
  Plus,
  Save,
  ExternalLink,
} from 'lucide-react'
import { toast } from '@/lib/toast'

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentProject } = useAuthStore()
  const { data: currentCustomer, isLoading: loading, error: queryError } = useCustomer(currentProject?.id, id)
  const { data: purchasesData, isLoading: purchasesLoading } = useCustomerPurchases(currentProject?.id, id)
  const updateCustomerMutation = useUpdateCustomer()
  const addTagMutation = useAddCustomerTag()

  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')

  const error = queryError?.message || (queryError ? String(queryError) : null)

  useEffect(() => {
    if (currentCustomer) {
      setEditForm({
        name: currentCustomer.name || '',
        phone: currentCustomer.phone || '',
        notes: currentCustomer.notes || '',
      })
    }
  }, [currentCustomer])

  const purchases = purchasesData || []

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateCustomerMutation.mutateAsync({
        projectId: currentProject.id,
        customerId: id,
        data: editForm
      })
      toast.success('Customer updated')
      setEditing(false)
    } catch (error) {
      toast.error('Failed to update customer')
    } finally {
      setSaving(false)
    }
  }

  const handleAddTag = async () => {
    if (!tagInput.trim()) return
    
    try {
      await addTagMutation.mutateAsync({
        projectId: currentProject.id,
        customerId: id,
        tag: tagInput.trim()
      })
      toast.success('Tag added')
      setTagInput('')
    } catch (error) {
      toast.error('Failed to add tag')
    }
  }

  if (loading) {
    return <DetailSkeleton />
  }

  if (error || (!loading && !currentCustomer)) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error || 'Customer not found'}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/commerce/customers')}
            >
              Back to Customers
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold">
              {currentCustomer.name || 'Unnamed Customer'}
            </h1>
            <p className="text-muted-foreground">{currentCustomer.email}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {currentCustomer.gmail_thread_id && (
            <Button variant="outline" asChild>
              <a
                href={`https://mail.google.com/mail/u/0/#inbox/${currentCustomer.gmail_thread_id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                View Gmail Thread
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          )}
          {editing ? (
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Spent</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              ${(currentCustomer.total_spent || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Purchases</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {currentCustomer.purchase_count || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Tags</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {currentCustomer.tags?.map(tag => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
              {(!currentCustomer.tags || currentCustomer.tags.length === 0) && (
                <span className="text-muted-foreground">No tags</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="purchases">Purchase History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6 space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Email</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${currentCustomer.email}`} className="hover:underline">
                      {currentCustomer.email}
                    </a>
                  </div>
                </div>
                
                <div>
                  <Label>Phone</Label>
                  {editing ? (
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Phone number"
                      className="mt-1"
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {currentCustomer.phone ? (
                        <a href={`tel:${currentCustomer.phone}`} className="hover:underline">
                          {currentCustomer.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Not provided</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {editing && (
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Customer name"
                    className="mt-1"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
              <CardDescription>Organize customers with tags</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {currentCustomer.tags?.map(tag => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button onClick={handleAddTag} disabled={!tagInput.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add internal notes about this customer..."
                  rows={4}
                />
              ) : (
                <p className={currentCustomer.notes ? '' : 'text-muted-foreground'}>
                  {currentCustomer.notes || 'No notes'}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
              <CardDescription>All purchases by this customer</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {purchasesLoading ? (
                <div className="p-4 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : purchases.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  No purchases yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Offering</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map(purchase => (
                      <TableRow key={purchase.id}>
                        <TableCell>
                          {new Date(purchase.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {purchase.offering ? (
                            <Link
                              to={`/commerce/offerings/${purchase.offering.id}`}
                              className="hover:underline"
                            >
                              {purchase.offering.name}
                            </Link>
                          ) : (
                            'Unknown'
                          )}
                        </TableCell>
                        <TableCell>
                          ${purchase.total_amount?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              purchase.status === 'completed'
                                ? 'default'
                                : purchase.status === 'pending'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {purchase.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Skeleton className="h-10 w-64" />
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
