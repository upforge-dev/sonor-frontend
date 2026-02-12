/**
 * ClientsView - Client management within the CRM module
 *
 * Shows converted/won contacts with engagement health metrics,
 * CSV import capability, and links to detail view with org-wide email visibility.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  Building2,
  Search,
  Upload,
  RefreshCw,
  Clock,
  Mail,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Moon,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  FileSpreadsheet,
  X,
  Download,
  Check,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/lib/toast'
import { crmApi } from '@/lib/portal-api'
import { UptradeSpinner } from '@/components/UptradeLoading'

// ─────────────────────────────────────────────────────────────────────────────
// Health badge component
// ─────────────────────────────────────────────────────────────────────────────

function HealthBadge({ status, daysSinceContact }) {
  const config = {
    active: {
      label: 'Active',
      icon: CheckCircle2,
      className: 'bg-green-500/10 text-green-600 border-green-500/20',
    },
    at_risk: {
      label: 'At Risk',
      icon: AlertTriangle,
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    },
    dormant: {
      label: 'Dormant',
      icon: Moon,
      className: 'bg-red-500/10 text-red-600 border-red-500/20',
    },
  }

  const { label, icon: Icon, className } = config[status] || config.dormant

  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border', className)}>
      <Icon className="h-3 w-3" />
      <span>{label}</span>
      {daysSinceContact !== null && (
        <span className="opacity-70">({daysSinceContact}d)</span>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV Import Dialog
// ─────────────────────────────────────────────────────────────────────────────

const EXPECTED_COLUMNS = ['name', 'email', 'company', 'phone', 'deal_value', 'won_date', 'notes', 'source']
const REQUIRED_COLUMNS = ['name', 'email']

function CSVImportDialog({ open, onOpenChange, onImportComplete, brandColors }) {
  const [step, setStep] = useState('upload') // upload | mapping | preview | importing
  const [csvData, setCsvData] = useState(null) // { headers: [], rows: [] }
  const [columnMapping, setColumnMapping] = useState({})
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [importResult, setImportResult] = useState(null)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef(null)

  const resetState = () => {
    setStep('upload')
    setCsvData(null)
    setColumnMapping({})
    setImportResult(null)
    setIsImporting(false)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.split('\n').filter((line) => line.trim())
      if (lines.length < 2) {
        toast.error('CSV must have at least a header row and one data row')
        return
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
      const rows = lines.slice(1).map((line) => {
        const values = line.match(/(".*?"|[^,]+)/g) || []
        return values.map((v) => v.trim().replace(/^"|"$/g, ''))
      })

      setCsvData({ headers, rows })

      // Auto-map columns by fuzzy matching
      const autoMapping = {}
      for (const expected of EXPECTED_COLUMNS) {
        const matchIdx = headers.findIndex(
          (h) =>
            h.toLowerCase() === expected ||
            h.toLowerCase().replace(/[_\s-]/g, '') === expected.replace(/_/g, '') ||
            h.toLowerCase().includes(expected.replace(/_/g, ' '))
        )
        if (matchIdx !== -1) {
          autoMapping[expected] = matchIdx
        }
      }
      setColumnMapping(autoMapping)
      setStep('mapping')
    }
    reader.readAsText(file)
  }

  const mappedData = csvData?.rows?.map((row) => {
    const obj = {}
    for (const [field, colIdx] of Object.entries(columnMapping)) {
      if (colIdx !== undefined && colIdx !== -1) {
        obj[field] = row[colIdx] || ''
      }
    }
    return obj
  }).filter((row) => row.name && row.email) || []

  const handleImport = async () => {
    if (mappedData.length === 0) {
      toast.error('No valid rows to import (name and email are required)')
      return
    }

    setIsImporting(true)
    setStep('importing')

    try {
      const { data } = await crmApi.importClients({
        clients: mappedData.map((row) => ({
          ...row,
          deal_value: row.deal_value ? parseFloat(row.deal_value) : undefined,
        })),
        skipDuplicates,
      })

      setImportResult(data)
      toast.success(`Imported ${data.imported} clients${data.skipped ? `, ${data.skipped} duplicates skipped` : ''}`)
      if (onImportComplete) onImportComplete()
    } catch (err) {
      toast.error('Import failed: ' + (err.response?.data?.message || err.message))
    } finally {
      setIsImporting(false)
    }
  }

  const isValid = columnMapping.name !== undefined && columnMapping.email !== undefined

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Clients from CSV
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a CSV file with client data.'}
            {step === 'mapping' && 'Map your CSV columns to client fields.'}
            {step === 'importing' && (isImporting ? 'Importing...' : 'Import complete!')}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">Click to upload CSV</p>
              <p className="text-sm text-muted-foreground mt-1">
                Required columns: name, email. Optional: company, phone, deal_value, won_date, notes, source
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />

            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs font-medium mb-1">Example CSV format:</p>
              <code className="text-xs text-muted-foreground">
                name,email,company,phone,deal_value,won_date<br />
                John Doe,john@acme.com,Acme Inc,555-0123,5000,2025-06-15
              </code>
            </div>
          </div>
        )}

        {step === 'mapping' && csvData && (
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              Found {csvData.rows.length} rows with {csvData.headers.length} columns
            </div>

            <div className="space-y-3">
              {EXPECTED_COLUMNS.map((field) => (
                <div key={field} className="flex items-center gap-3">
                  <div className="w-32 text-sm font-medium capitalize flex items-center gap-1">
                    {field.replace(/_/g, ' ')}
                    {REQUIRED_COLUMNS.includes(field) && (
                      <span className="text-red-500">*</span>
                    )}
                  </div>
                  <Select
                    value={columnMapping[field]?.toString() ?? '-1'}
                    onValueChange={(v) =>
                      setColumnMapping((prev) => ({
                        ...prev,
                        [field]: v === '-1' ? undefined : parseInt(v),
                      }))
                    }
                  >
                    <SelectTrigger className="flex-1 h-8">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-1">-- Skip --</SelectItem>
                      {csvData.headers.map((header, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {header}
                          {csvData.rows[0]?.[idx] && (
                            <span className="text-muted-foreground ml-2">
                              (e.g. {csvData.rows[0][idx].substring(0, 20)})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                checked={skipDuplicates}
                onCheckedChange={setSkipDuplicates}
                id="skip-dupes"
              />
              <label htmlFor="skip-dupes" className="text-sm">
                Skip duplicate emails (instead of updating existing contacts)
              </label>
            </div>

            {mappedData.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-medium mb-2">Preview ({Math.min(3, mappedData.length)} of {mappedData.length} valid rows):</p>
                <div className="space-y-1">
                  {mappedData.slice(0, 3).map((row, i) => (
                    <div key={i} className="text-xs text-muted-foreground">
                      {row.name} &lt;{row.email}&gt;{row.company ? ` - ${row.company}` : ''}
                      {row.deal_value ? ` ($${row.deal_value})` : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'importing' && (
          <div className="py-8 text-center">
            {isImporting ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                <p className="text-sm text-muted-foreground">Importing clients...</p>
              </>
            ) : importResult ? (
              <>
                <Check className="h-8 w-8 mx-auto mb-3 text-green-500" />
                <p className="font-medium mb-2">Import Complete</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{importResult.imported} clients imported</p>
                  {importResult.skipped > 0 && <p>{importResult.skipped} duplicates skipped</p>}
                  {importResult.errors?.length > 0 && (
                    <p className="text-red-500">{importResult.errors.length} errors</p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}

        <DialogFooter>
          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => { setStep('upload'); setCsvData(null) }}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={!isValid || mappedData.length === 0}
                style={isValid ? { backgroundColor: brandColors?.primary, color: 'white' } : {}}
              >
                Import {mappedData.length} Clients
              </Button>
            </>
          )}
          {step === 'importing' && !isImporting && (
            <Button onClick={() => { onOpenChange(false); resetState() }}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ClientsView component
// ─────────────────────────────────────────────────────────────────────────────

export default function ClientsView({ onClientClick, brandColors }) {
  const [clients, setClients] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [healthFilter, setHealthFilter] = useState('all')
  const [sortBy, setSortBy] = useState('last_contact_at')
  const [sortOrder, setSortOrder] = useState('asc')
  const [summary, setSummary] = useState({ total: 0, active: 0, at_risk: 0, dormant: 0 })
  const [isImportOpen, setIsImportOpen] = useState(false)

  const fetchClients = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await crmApi.listClients({
        health: healthFilter !== 'all' ? healthFilter : undefined,
        search: searchQuery || undefined,
        sortBy,
        sortOrder,
        limit: 100,
      })
      setClients(data.data || [])
      setSummary(data.summary || { total: 0, active: 0, at_risk: 0, dormant: 0 })
    } catch (err) {
      console.error('Failed to fetch clients:', err)
      toast.error('Failed to load clients')
    } finally {
      setIsLoading(false)
    }
  }, [healthFilter, searchQuery, sortBy, sortOrder])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortOrder(field === 'last_contact_at' ? 'asc' : 'desc')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '--'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatCurrency = (val) => {
    if (!val) return '--'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  const SortHeader = ({ field, children }) => (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortBy === field ? (
          sortOrder === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  )

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex-none p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3">
          <Card
            className={cn(
              'cursor-pointer transition-all border',
              healthFilter === 'all' ? 'ring-2' : 'hover:shadow-sm'
            )}
            style={healthFilter === 'all' ? { borderColor: brandColors?.primary, ringColor: brandColors?.primary + '40' } : {}}
            onClick={() => setHealthFilter('all')}
          >
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold" style={{ color: brandColors?.primary }}>{summary.total}</p>
              <p className="text-xs text-muted-foreground">Total Clients</p>
            </CardContent>
          </Card>
          <Card
            className={cn(
              'cursor-pointer transition-all border',
              healthFilter === 'active' ? 'ring-2 ring-green-500/40 border-green-500' : 'hover:shadow-sm'
            )}
            onClick={() => setHealthFilter(healthFilter === 'active' ? 'all' : 'active')}
          >
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{summary.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card
            className={cn(
              'cursor-pointer transition-all border',
              healthFilter === 'at_risk' ? 'ring-2 ring-amber-500/40 border-amber-500' : 'hover:shadow-sm'
            )}
            onClick={() => setHealthFilter(healthFilter === 'at_risk' ? 'all' : 'at_risk')}
          >
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{summary.at_risk}</p>
              <p className="text-xs text-muted-foreground">At Risk</p>
            </CardContent>
          </Card>
          <Card
            className={cn(
              'cursor-pointer transition-all border',
              healthFilter === 'dormant' ? 'ring-2 ring-red-500/40 border-red-500' : 'hover:shadow-sm'
            )}
            onClick={() => setHealthFilter(healthFilter === 'dormant' ? 'all' : 'dormant')}
          >
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{summary.dormant}</p>
              <p className="text-xs text-muted-foreground">Dormant</p>
            </CardContent>
          </Card>
        </div>

        {/* Search + Actions */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportOpen(true)}
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Import CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchClients}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <UptradeSpinner size="lg" />
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-medium mb-1">No clients yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || healthFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Import existing clients or convert leads from the pipeline'}
            </p>
            <Button
              variant="outline"
              onClick={() => setIsImportOpen(true)}
            >
              <Upload className="h-4 w-4 mr-1.5" />
              Import from CSV
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader field="name">Client</SortHeader>
                <TableHead>Health</TableHead>
                <SortHeader field="last_contact_at">Last Contact</SortHeader>
                <SortHeader field="deal_value">Deal Value</SortHeader>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Emails
                  </div>
                </TableHead>
                <SortHeader field="won_date">Won Date</SortHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onClientClick?.(client)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                        style={{ backgroundColor: brandColors?.primary || '#3B82F6' }}
                      >
                        {(client.name || '?')[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{client.name}</p>
                        {client.company && (
                          <p className="text-xs text-muted-foreground truncate">{client.company}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <HealthBadge
                      status={client.health_status}
                      daysSinceContact={client.days_since_contact}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {client.last_contact_at ? (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {formatDate(client.last_contact_at)}
                      </div>
                    ) : (
                      <span className="text-red-500/70 italic">Never</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatCurrency(client.deal_value)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {client.email_thread_count || 0}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(client.won_date)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImportComplete={fetchClients}
        brandColors={brandColors}
      />
    </div>
  )
}
