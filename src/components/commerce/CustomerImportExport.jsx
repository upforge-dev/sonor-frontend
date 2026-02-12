// src/components/commerce/CustomerImportExport.jsx
// Import and export customers via CSV
// MIGRATED TO REACT QUERY HOOKS - Jan 29, 2026

import { useState, useRef } from 'react'
import useAuthStore from '@/lib/auth-store'
import { useCreateCustomer, customersKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import portalApi from '@/lib/portal-api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Upload,
  Download,
  FileSpreadsheet,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Users,
} from 'lucide-react'
import { toast } from '@/lib/toast'

export default function CustomerImportExport({ open, onOpenChange }) {
  const { currentProject } = useAuthStore()
  const queryClient = useQueryClient()
  const createCustomerMutation = useCreateCustomer()
  
  const [activeTab, setActiveTab] = useState('import')
  
  // Import state
  const fileInputRef = useRef(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResults, setImportResults] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const [parseErrors, setParseErrors] = useState([])
  
  // Export state
  const [exporting, setExporting] = useState(false)

  const resetImportState = () => {
    setParsedData(null)
    setParseErrors([])
    setImportResults(null)
    setImportProgress(0)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    resetImportState()

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const csv = event.target?.result
        if (typeof csv !== 'string') return

        const parsed = parseCSV(csv)
        setParsedData(parsed.data)
        setParseErrors(parsed.errors)
      } catch (err) {
        console.error('Failed to parse CSV:', err)
        toast.error('Failed to parse CSV file')
      }
    }
    reader.readAsText(file)
  }

  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').map(line => line.trim()).filter(Boolean)
    if (lines.length === 0) {
      return { data: [], errors: ['Empty CSV file'] }
    }

    // Parse header
    const header = parseCSVLine(lines[0])
    const requiredFields = ['email']
    const optionalFields = ['name', 'phone', 'tags', 'notes', 'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country']
    
    // Normalize headers
    const normalizedHeader = header.map(h => h.toLowerCase().trim().replace(/\s+/g, '_'))
    
    // Check for required fields
    const missingRequired = requiredFields.filter(f => !normalizedHeader.includes(f))
    if (missingRequired.length > 0) {
      return { 
        data: [], 
        errors: [`Missing required column(s): ${missingRequired.join(', ')}`] 
      }
    }

    const errors = []
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      const row = {}
      
      normalizedHeader.forEach((key, idx) => {
        if (requiredFields.includes(key) || optionalFields.includes(key)) {
          row[key] = values[idx]?.trim() || ''
        }
      })

      // Validate email
      if (!row.email || !isValidEmail(row.email)) {
        errors.push({ row: i + 1, message: `Invalid email: ${row.email || '(empty)'}` })
        continue
      }

      // Parse tags if provided
      if (row.tags) {
        row.tags = row.tags.split(',').map(t => t.trim()).filter(Boolean)
      } else {
        row.tags = []
      }

      data.push(row)
    }

    return { data, errors }
  }

  const parseCSVLine = (line) => {
    const result = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)
    
    return result.map(s => s.replace(/^"|"$/g, ''))
  }

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleImport = async () => {
    if (!parsedData || parsedData.length === 0) {
      toast.error('No valid data to import')
      return
    }

    setImporting(true)
    setImportProgress(0)
    
    const results = { created: 0, skipped: 0, errors: [] }
    
    for (let i = 0; i < parsedData.length; i++) {
      const customer = parsedData[i]
      
      try {
        await createCustomerMutation.mutateAsync({
          projectId: currentProject.id,
          data: customer
        })
        results.created++
      } catch (err) {
        if (err.response?.status === 409) {
          // Duplicate - already exists
          results.skipped++
        } else {
          results.errors.push({ email: customer.email, message: err.response?.data?.message || 'Unknown error' })
        }
      }
      
      setImportProgress(Math.round(((i + 1) / parsedData.length) * 100))
    }

    setImportResults(results)
    setImporting(false)
    
    // Refresh customer list
    queryClient.invalidateQueries({ queryKey: customersKeys.list(currentProject.id, {}) })
    
    if (results.errors.length === 0) {
      toast.success(`Imported ${results.created} customers (${results.skipped} already existed)`)
    } else {
      toast.warning(`Imported ${results.created} customers with ${results.errors.length} errors`)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    
    try {
      // Fetch all customers
      const params = new URLSearchParams({ limit: '10000' })
      const response = await portalApi.get(`/commerce/customers/${currentProject.id}?${params}`)
      const result = response.data
      const customers = Array.isArray(result) ? result : result.data || []
      
      if (!customers || customers.length === 0) {
        toast.error('No customers to export')
        return
      }

      // Build CSV
      const headers = ['email', 'name', 'phone', 'tags', 'notes', 'total_spent', 'total_purchases', 'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country', 'created_at']
      
      const csvRows = [headers.join(',')]
      
      for (const customer of customers) {
        const row = [
          escapeCSVField(customer.email || ''),
          escapeCSVField(customer.name || ''),
          escapeCSVField(customer.phone || ''),
          escapeCSVField((customer.tags || []).join(', ')),
          escapeCSVField(customer.notes || ''),
          customer.total_spent || 0,
          customer.total_purchases || 0,
          escapeCSVField(customer.address_line1 || ''),
          escapeCSVField(customer.address_line2 || ''),
          escapeCSVField(customer.city || ''),
          escapeCSVField(customer.state || ''),
          escapeCSVField(customer.postal_code || ''),
          escapeCSVField(customer.country || ''),
          customer.created_at || '',
        ]
        csvRows.push(row.join(','))
      }

      const csvContent = csvRows.join('\n')
      
      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `customers-${currentProject.id}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success(`Exported ${customers.length} customers`)
    } catch (err) {
      console.error('Failed to export:', err)
      toast.error('Failed to export customers')
    } finally {
      setExporting(false)
    }
  }

  const escapeCSVField = (value) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  const handleClose = () => {
    resetImportState()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import / Export Customers
          </DialogTitle>
          <DialogDescription>
            Import customers from CSV or export your customer list
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </TabsTrigger>
            <TabsTrigger value="export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4 mt-4">
            {/* File Upload */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <Card 
                className="border-dashed cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <CardContent className="py-8 text-center">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <p className="font-medium">Click to upload CSV file</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Required: email column. Optional: name, phone, tags, notes
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Parse Errors */}
            {parseErrors.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">
                      Parse Warnings
                    </span>
                  </div>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    {parseErrors.slice(0, 5).map((error, i) => (
                      <li key={i}>
                        {typeof error === 'string' 
                          ? error 
                          : `Row ${error.row}: ${error.message}`
                        }
                      </li>
                    ))}
                    {parseErrors.length > 5 && (
                      <li>...and {parseErrors.length - 5} more</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Preview */}
            {parsedData && parsedData.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    Preview ({parsedData.length} customers)
                  </span>
                  <Badge variant="secondary">
                    <Check className="h-3 w-3 mr-1" />
                    Ready to import
                  </Badge>
                </div>
                
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Tags</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 10).map((customer, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-sm">{customer.email}</TableCell>
                          <TableCell>{customer.name || '—'}</TableCell>
                          <TableCell>{customer.phone || '—'}</TableCell>
                          <TableCell>
                            {customer.tags?.length > 0 ? (
                              <div className="flex gap-1">
                                {customer.tags.slice(0, 2).map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {customer.tags.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{customer.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {parsedData.length > 10 && (
                    <div className="py-2 text-center text-sm text-muted-foreground border-t">
                      ...and {parsedData.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Import Progress */}
            {importing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Importing customers...</span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} />
              </div>
            )}

            {/* Import Results */}
            {importResults && (
              <Card className={importResults.errors.length > 0 ? 'border-yellow-200' : 'border-green-200'}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{importResults.created} created</span>
                    </div>
                    {importResults.skipped > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{importResults.skipped} already existed</span>
                      </div>
                    )}
                    {importResults.errors.length > 0 && (
                      <div className="flex items-center gap-2">
                        <X className="h-4 w-4 text-red-600" />
                        <span className="text-sm">{importResults.errors.length} failed</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport}
                disabled={!parsedData || parsedData.length === 0 || importing}
              >
                {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Import {parsedData?.length || 0} Customers
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="export" className="space-y-4 mt-4">
            <Card>
              <CardContent className="py-8 text-center">
                <Download className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">Export All Customers</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Download a CSV file containing all your customers
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Includes: email, name, phone, tags, notes, total spent, purchase count, address, created date
                </p>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleExport} disabled={exporting}>
                {exporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Export Customers
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
