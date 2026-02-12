// src/pages/commerce/CustomersPage.jsx
// Customers list with search and filters
// MIGRATED TO REACT QUERY HOOKS - Jan 29, 2026

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCustomers, useCreateCustomer } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import useAuthStore from '@/lib/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
  Users,
  Search,
  Plus,
  DollarSign,
  ShoppingCart,
  Mail,
  Phone,
  Tag,
  Upload,
  Download,
} from 'lucide-react'
import CustomerImportExport from '@/components/commerce/CustomerImportExport'
import { toast } from '@/lib/toast'

export default function CustomersPage() {
  const { currentProject } = useAuthStore()
  const [search, setSearch] = useState('')
  const { data: customersData, isLoading: customersLoading, error: customersError } = useCustomers(
    currentProject?.id,
    { search: search || undefined }
  )
  const createCustomerMutation = useCreateCustomer()

  const [createOpen, setCreateOpen] = useState(false)
  const [importExportOpen, setImportExportOpen] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ email: '', name: '', phone: '' })

  const customers = customersData?.customers || []

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newCustomer.email.trim()) {
      toast.error('Email is required')
      return
    }

    try {
      await createCustomerMutation.mutateAsync({
        projectId: currentProject.id,
        data: newCustomer
      })
      toast.success('Customer created successfully')
      setCreateOpen(false)
      setNewCustomer({ email: '', name: '', phone: '' })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create customer')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">
            People who have purchased from you
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportExportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import / Export
          </Button>
          
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Customer</DialogTitle>
                <DialogDescription>
                  Create a new customer record
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="customer@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Creating...' : 'Create Customer'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Import/Export Dialog */}
      <CustomerImportExport
        open={importExportOpen}
        onOpenChange={setImportExportOpen}
      />

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {customersLoading ? (
            <TableSkeleton />
          ) : customersError ? (
            <div className="p-6 text-center text-red-600">
              Failed to load customers: {customersError}
            </div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No customers yet</h3>
              <p className="text-muted-foreground mb-4">
                {search
                  ? 'Try adjusting your search'
                  : 'Customers will appear here when they make purchases'}
              </p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Purchases</TableHead>
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map(customer => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Link
                        to={`/commerce/customers/${customer.id}`}
                        className="font-medium hover:underline"
                      >
                        {customer.name || 'Unnamed'}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {customer.email}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <a href={`mailto:${customer.email}`} className="hover:underline">
                              {customer.email}
                            </a>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <a href={`tel:${customer.phone}`} className="hover:underline">
                              {customer.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {(customer.total_spent || 0).toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.purchase_count || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.tags?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {customer.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {customer.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{customer.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  )
}
