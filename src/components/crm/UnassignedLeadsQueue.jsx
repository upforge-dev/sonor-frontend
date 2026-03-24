/**
 * UnassignedLeadsQueue - Queue for leads without an owner
 * 
 * Features:
 * - Shows leads ordered by score (hot first)
 * - Quick claim button for team members
 * - Assign dropdown for managers
 * - Filter by source, score
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Users,
  UserPlus,
  Loader2,
  RefreshCw,
  Zap,
  Star,
  Clock,
  Mail,
  Phone,
  Building2,
  Filter,
  Hand,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from '@/lib/toast'
import { crmApi } from '@/lib/sonor-api'
import { useBrandColors } from '@/hooks/useBrandColors'
import { useTeamMembers, teamKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import AssignContactDialog from './AssignContactDialog'

// Format relative time
function formatRelativeTime(date) {
  if (!date) return 'Never'
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

// Score badge component
function ScoreBadge({ score }) {
  if (!score && score !== 0) return null
  
  let color = 'bg-gray-500/20 text-gray-400'
  let icon = null
  
  if (score >= 80) {
    color = 'bg-amber-500/20 text-amber-500'
    icon = <Zap className="h-3 w-3" />
  } else if (score >= 50) {
    color = 'bg-blue-500/20 text-blue-500'
    icon = <Star className="h-3 w-3" />
  }
  
  return (
    <Badge className={cn('gap-1', color)}>
      {icon}
      {score}
    </Badge>
  )
}

// Individual lead card
function UnassignedLeadCard({
  lead,
  isSelected,
  onSelect,
  onClaim,
  onAssign,
  isClaiming,
  brandColors,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer',
        'hover:shadow-sm hover:border-[var(--glass-border-hover)]',
        isSelected
          ? 'border-2 bg-[var(--glass-bg)]'
          : 'border-[var(--glass-border)] bg-[var(--glass-bg)]'
      )}
      style={isSelected ? { borderColor: brandColors.primary } : {}}
      onClick={() => onSelect(lead)}
    >
      {/* Selection Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onSelect(lead)}
        onClick={(e) => e.stopPropagation()}
      />
      
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0"
        style={{ backgroundColor: brandColors.primary }}
      >
        {lead.name?.charAt(0)?.toUpperCase() || '?'}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-[var(--text-primary)] truncate">
            {lead.name}
          </p>
          <ScoreBadge score={lead.lead_score} />
        </div>
        <div className="flex items-center gap-3 text-sm text-[var(--text-tertiary)]">
          {lead.company && (
            <span className="flex items-center gap-1 truncate">
              <Building2 className="h-3.5 w-3.5" />
              {lead.company}
            </span>
          )}
          {lead.email && (
            <span className="flex items-center gap-1 truncate">
              <Mail className="h-3.5 w-3.5" />
              {lead.email}
            </span>
          )}
        </div>
      </div>
      
      {/* Source */}
      {lead.source && (
        <Badge variant="outline" className="flex-shrink-0">
          {lead.source}
        </Badge>
      )}
      
      {/* Time */}
      <span className="text-xs text-[var(--text-tertiary)] flex-shrink-0 flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" />
        {formatRelativeTime(lead.created_at)}
      </span>
      
      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  onClaim(lead)
                }}
                disabled={isClaiming}
                className="gap-1.5"
              >
                {isClaiming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Hand className="h-4 w-4" />
                )}
                Claim
              </Button>
            </TooltipTrigger>
            <TooltipContent>Claim this lead for yourself</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  onAssign(lead)
                }}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Assign to team member</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </motion.div>
  )
}

export default function UnassignedLeadsQueue({
  onLeadClick,
  onLeadAssigned,
  className,
}) {
  const brandColors = useBrandColors()
  // Team members are fetched via React Query hooks in AssignContactDialog
  
  const [leads, setLeads] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [claimingId, setClaimingId] = useState(null)
  const [totalCount, setTotalCount] = useState(0)
  
  // Selection
  const [selectedLeads, setSelectedLeads] = useState([])
  
  // Filters
  const [sourceFilter, setSourceFilter] = useState('all')
  const [scoreFilter, setScoreFilter] = useState('all')
  
  // Assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [leadsToAssign, setLeadsToAssign] = useState([])
  
  // Fetch leads
  const fetchLeads = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setIsRefreshing(true)
      else setIsLoading(true)
      
      const params = {}
      if (sourceFilter !== 'all') params.source = sourceFilter
      if (scoreFilter !== 'all') {
        if (scoreFilter === 'hot') params.min_score = 80
        else if (scoreFilter === 'warm') params.min_score = 50
      }
      
      const response = await crmApi.listUnassignedLeads(params)
      setLeads(response.data?.leads || [])
      setTotalCount(response.data?.total || 0)
    } catch (error) {
      console.error('Failed to fetch unassigned leads:', error)
      toast.error('Failed to load unassigned leads')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [sourceFilter, scoreFilter])
  
  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])
  
  // Handle claim
  const handleClaim = async (lead) => {
    try {
      setClaimingId(lead.id)
      await crmApi.claimLead(lead.id)
      toast.success(`Claimed ${lead.name}`)
      
      // Remove from list
      setLeads((prev) => prev.filter((l) => l.id !== lead.id))
      setTotalCount((prev) => prev - 1)
      setSelectedLeads((prev) => prev.filter((id) => id !== lead.id))
      
      onLeadAssigned?.(lead)
    } catch (error) {
      console.error('Failed to claim lead:', error)
      toast.error('Failed to claim lead')
    } finally {
      setClaimingId(null)
    }
  }
  
  // Handle assign
  const handleAssign = (lead) => {
    setLeadsToAssign([lead])
    setAssignDialogOpen(true)
  }
  
  // Handle bulk assign
  const handleBulkAssign = () => {
    const leadsToAssignArr = leads.filter((l) => selectedLeads.includes(l.id))
    setLeadsToAssign(leadsToAssignArr)
    setAssignDialogOpen(true)
  }
  
  // Handle assignment complete
  const handleAssignmentComplete = (assignedToId, notify) => {
    const contactIds = leadsToAssign.map((l) => l.id)
    
    crmApi.bulkAssignLeads({
      contact_ids: contactIds,
      assigned_to: assignedToId,
      notify,
    })
      .then(() => {
        toast.success(`Assigned ${contactIds.length} lead${contactIds.length > 1 ? 's' : ''}`)
        
        // Remove from list
        setLeads((prev) => prev.filter((l) => !contactIds.includes(l.id)))
        setTotalCount((prev) => prev - contactIds.length)
        setSelectedLeads([])
        
        leadsToAssign.forEach((lead) => onLeadAssigned?.(lead))
      })
      .catch((err) => {
        console.error('Assignment failed:', err)
        toast.error('Failed to assign leads')
      })
      .finally(() => {
        setAssignDialogOpen(false)
        setLeadsToAssign([])
      })
  }
  
  // Toggle selection
  const toggleSelection = (lead) => {
    setSelectedLeads((prev) =>
      prev.includes(lead.id)
        ? prev.filter((id) => id !== lead.id)
        : [...prev, lead.id]
    )
  }
  
  // Select all
  const handleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(leads.map((l) => l.id))
    }
  }
  
  // Get unique sources for filter
  const sources = [...new Set(leads.map((l) => l.source).filter(Boolean))]
  
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
      </div>
    )
  }
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: brandColors.rgba.primary15 }}
          >
            <Users className="h-5 w-5" style={{ color: brandColors.primary }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Unassigned Leads
            </h3>
            <p className="text-sm text-[var(--text-tertiary)]">
              {totalCount} leads waiting for assignment
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchLeads(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
        </div>
      </div>
      
      {/* Filters & Bulk Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Source Filter */}
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {sources.map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Score Filter */}
          <Select value={scoreFilter} onValueChange={setScoreFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Score" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scores</SelectItem>
              <SelectItem value="hot">
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-amber-500" />
                  Hot (80+)
                </span>
              </SelectItem>
              <SelectItem value="warm">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-blue-500" />
                  Warm (50+)
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Bulk Actions */}
        {selectedLeads.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-tertiary)]">
              {selectedLeads.length} selected
            </span>
            <Button size="sm" onClick={handleBulkAssign}>
              <UserPlus className="h-4 w-4 mr-1" />
              Assign Selected
            </Button>
          </div>
        )}
      </div>
      
      {/* Select All */}
      {leads.length > 0 && (
        <div className="flex items-center gap-2 px-2">
          <Checkbox
            checked={selectedLeads.length === leads.length && leads.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm text-[var(--text-tertiary)]">
            Select all
          </span>
        </div>
      )}
      
      {/* Leads List */}
      {leads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
            <h4 className="text-lg font-medium text-[var(--text-primary)]">
              All Caught Up!
            </h4>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              No unassigned leads at the moment
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {leads.map((lead) => (
                <UnassignedLeadCard
                  key={lead.id}
                  lead={lead}
                  isSelected={selectedLeads.includes(lead.id)}
                  onSelect={toggleSelection}
                  onClaim={handleClaim}
                  onAssign={handleAssign}
                  isClaiming={claimingId === lead.id}
                  brandColors={brandColors}
                />
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      )}
      
      {/* Assign Dialog */}
      <AssignContactDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        contacts={leadsToAssign}
        onAssign={handleAssignmentComplete}
      />
    </div>
  )
}
