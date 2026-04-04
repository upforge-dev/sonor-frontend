import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { toast } from 'sonner'

export default function ContactsManager() {
  const [contacts, setContacts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      const text = await file.text()
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      
      const importData = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim())
          return {
            email: values[headers.indexOf('email')],
            name: values[headers.indexOf('name')] || values[headers.indexOf('firstname')],
            company: values[headers.indexOf('company')] || '',
            timezone: values[headers.indexOf('timezone')] || 'UTC',
          }
        })
        .filter(c => c.email)

      toast.success(`Imported ${importData.length} contacts`)
    } catch (err) {
      toast.error('Failed to import CSV')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Label htmlFor="csv-upload" className="cursor-pointer">
          <Button asChild>
            <span className="gap-2">
              <Upload className="h-4 w-4" />
              Import CSV
            </span>
          </Button>
        </Label>
        <input
          id="csv-upload"
          type="file"
          accept=".csv"
          onChange={handleCSVImport}
          className="hidden"
          disabled={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contacts List</CardTitle>
          <CardDescription>Manage subscribers and contacts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-[var(--text-secondary)]">No contacts yet. Import a CSV to get started.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
