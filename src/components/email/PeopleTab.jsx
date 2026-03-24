/**
 * PeopleTab - Sync Contacts and Prospects as mailable lists
 * 
 * Shows both CRM contacts and prospects with:
 * - Sync to email lists functionality
 * - Filter by form tags (for prospects)
 * - Quick actions to add to campaigns
 */
import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  UserPlus,
  Search,
  Filter,
  Tag,
  Mail,
  Phone,
  Building2,
  Globe,
  MoreVertical,
  RefreshCw,
  ArrowUpRight,
  ListPlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { crmApi, emailApi } from '@/lib/sonor-api'
import { useEmailPlatformStore } from '@/lib/email-platform-store'
import { formatDistanceToNow } from 'date-fns'

// ============================================
// PEOPLE TAB COMPONENT
// ============================================
export default function PeopleTab() {
  const { lists, fetchLists, fetchSubscribers } = useEmailPlatformStore()
  
  // State
  const [activeView, setActiveView] = useState('prospects')
  const [prospects, setProspects] = useState([])
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  
  // Sync to list dialog
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [syncTarget, setSyncTarget] = useState(null) // 'prospects' | 'contacts'
  const [selectedListId, setSelectedListId] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  // Fetch data on mount
  useEffect(() => {
    fetchData()
    fetchLists()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch prospects (contacts endpoint not implemented in backend)
      const prospectsRes = await crmApi.listProspects({ limit: 500 }).catch(err => {
        console.warn('Failed to fetch prospects:', err.message)
        return { data: { prospects: [] } }
      })
      
      setProspects(prospectsRes.data?.prospects || prospectsRes.data?.data || [])
      // Note: contacts endpoint not yet implemented in CRM module
      // For now, we only show prospects in the People tab
      setContacts([])
    } catch (error) {
      console.error('Failed to fetch people:', error)
      toast.error('Failed to load people data')
    } finally {
      setLoading(false)
    }
  }

  // Extract unique tags from prospects
  const availableTags = useMemo(() => {
    const tagSet = new Set()
    prospects.forEach(p => {
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach(tag => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort()
  }, [prospects])

  // Filter prospects
  const filteredProspects = useMemo(() => {
    return prospects.filter(p => {
      const matchesSearch = !searchQuery || 
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.company?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesTag = !tagFilter || 
        (p.tags && p.tags.includes(tagFilter))
      
      return matchesSearch && matchesTag
    })
  }, [prospects, searchQuery, tagFilter])

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      return !searchQuery || 
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company?.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }, [contacts, searchQuery])

  // Selection handling
  const currentList = activeView === 'prospects' ? filteredProspects : filteredContacts
  const allSelected = currentList.length > 0 && selectedIds.length === currentList.length
  
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(currentList.map(item => item.id))
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : [...prev, id]
    )
  }

  // Reset selection when switching views
  useEffect(() => {
    setSelectedIds([])
  }, [activeView])

  // Sync to email list
  const handleSyncToList = async () => {
    if (!selectedListId) {
      toast.error('Please select a list')
      return
    }

    setSyncing(true)
    setSyncResult(null)

    try {
      const sourceData = syncTarget === 'prospects' 
        ? prospects.filter(p => selectedIds.includes(p.id))
        : contacts.filter(c => selectedIds.includes(c.id))

      let added = 0
      let skipped = 0

      for (const person of sourceData) {
        if (!person.email) {
          skipped++
          continue
        }

        try {
          await emailApi.createSubscriber({
            email: person.email,
            firstName: person.name?.split(' ')[0] || '',
            lastName: person.name?.split(' ').slice(1).join(' ') || '',
            listIds: [selectedListId],
            source: syncTarget === 'prospects' ? 'crm_prospect' : 'crm_contact',
            metadata: {
              crmId: person.id,
              company: person.company,
              phone: person.phone,
            },
            tags: person.tags || [],
          })
          added++
        } catch (err) {
          // Likely duplicate, count as skipped
          skipped++
        }
      }

      setSyncResult({ added, skipped })
      toast.success(`Synced ${added} people to list`)
      
      // Refresh subscribers
      fetchSubscribers()
    } catch (error) {
      console.error('Sync failed:', error)
      toast.error('Failed to sync to list')
    } finally {
      setSyncing(false)
    }
  }

  // Open sync dialog
  const openSyncDialog = (target) => {
    setSyncTarget(target)
    setShowSyncDialog(true)
    setSyncResult(null)
    setSelectedListId('')
  }

  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">People</h2>
          <p className="text-sm text-muted-foreground">
            Sync CRM contacts and prospects to your email lists
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{prospects.length}</p>
                <p className="text-xs text-muted-foreground">Prospects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contacts.length}</p>
                <p className="text-xs text-muted-foreground">Contacts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Tag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{availableTags.length}</p>
                <p className="text-xs text-muted-foreground">Form Tags</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Mail className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lists.length}</p>
                <p className="text-xs text-muted-foreground">Email Lists</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="prospects" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Prospects
              <Badge variant="secondary" className="ml-1">{prospects.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-2">
              <Users className="h-4 w-4" />
              Contacts
              <Badge variant="secondary" className="ml-1">{contacts.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">{selectedIds.length} selected</Badge>
              <Button 
                size="sm" 
                onClick={() => openSyncDialog(activeView)}
              >
                <ListPlus className="h-4 w-4 mr-2" />
                Add to Email List
              </Button>
            </div>
          )}
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {activeView === 'prospects' && availableTags.length > 0 && (
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Tags</SelectItem>
                {availableTags.map(tag => (
                  <SelectItem key={tag} value={tag}>
                    {tag.startsWith('form:') ? (
                      <span className="flex items-center gap-2">
                        <Tag className="h-3 w-3" />
                        {tag.replace('form:', '')}
                      </span>
                    ) : tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Prospects Table */}
        <TabsContent value="prospects" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredProspects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No prospects found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProspects.map((prospect) => (
                    <TableRow key={prospect.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedIds.includes(prospect.id)}
                          onCheckedChange={() => toggleSelect(prospect.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {prospect.name || '-'}
                      </TableCell>
                      <TableCell>
                        {prospect.email ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {prospect.email}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {prospect.company ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            {prospect.company}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {prospect.pipeline_stage || 'new'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {prospect.tags?.slice(0, 2).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag.replace('form:', '📋 ')}
                            </Badge>
                          ))}
                          {prospect.tags?.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{prospect.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedIds([prospect.id])
                              openSyncDialog('prospects')
                            }}>
                              <ListPlus className="h-4 w-4 mr-2" />
                              Add to List
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Contacts Table */}
        <TabsContent value="contacts" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No contacts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedIds.includes(contact.id)}
                          onCheckedChange={() => toggleSelect(contact.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {contact.name || '-'}
                      </TableCell>
                      <TableCell>
                        {contact.email ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {contact.email}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.phone ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {contact.phone}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.company ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            {contact.company}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {contact.source || 'manual'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedIds([contact.id])
                              openSyncDialog('contacts')
                            }}>
                              <ListPlus className="h-4 w-4 mr-2" />
                              Add to List
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sync to List Dialog */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Email List</DialogTitle>
            <DialogDescription>
              Sync {selectedIds.length} {syncTarget === 'prospects' ? 'prospects' : 'contacts'} to an email list
            </DialogDescription>
          </DialogHeader>

          {syncResult ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-semibold text-lg">Sync Complete!</p>
                <div className="flex justify-center gap-6 text-sm">
                  <div>
                    <span className="font-bold text-green-600">{syncResult.added}</span> added
                  </div>
                  <div>
                    <span className="font-bold text-gray-500">{syncResult.skipped}</span> skipped
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowSyncDialog(false)}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Email List</Label>
                  <Select value={selectedListId} onValueChange={setSelectedListId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a list..." />
                    </SelectTrigger>
                    <SelectContent>
                      {lists.map((list) => (
                        <SelectItem key={list.id} value={list.id}>
                          {list.name}
                          {list.subscriberCount !== undefined && (
                            <span className="text-muted-foreground ml-2">
                              ({list.subscriberCount} subscribers)
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {lists.length === 0 && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <p>No email lists found. Create a list first in the Lists tab.</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSyncDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSyncToList} 
                  disabled={!selectedListId || syncing}
                >
                  {syncing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <ListPlus className="h-4 w-4 mr-2" />
                      Add to List
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
