/**
 * CRMEmailHub - Full Gmail Inbox with Intelligent Classification
 * 
 * Features:
 * - Full Gmail inbox sync and display
 * - Intelligent email classification (client, prospect, team, customer, spam, solicitation)
 * - "Needs Response" prioritization
 * - Contact/customer matching
 * - Signal AI draft generation
 * - Compose new emails
 */
import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  Send,
  Inbox,
  Star,
  Archive,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  User,
  Clock,
  ChevronRight,
  Paperclip,
  MailOpen,
  Reply,
  Forward,
  MoreVertical,
  AlertTriangle,
  Users,
  Building2,
  ShoppingBag,
  Ban,
  Megaphone,
  Bell,
  Zap,
  MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/lib/toast'
import useAuthStore from '@/lib/auth-store'
import { crmApi } from '@/lib/portal-api'
import { crmAiApi } from '@/lib/signal-api'
import { GmailConnectCard } from '../email/GmailConnectCard'
import EmailComposeDialog from './EmailComposeDialog'
import SignalIcon from '@/components/ui/SignalIcon'

// Classification badge colors and icons
const CLASSIFICATION_CONFIG = {
  client: { label: 'Client', icon: Building2, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  prospect: { label: 'Prospect', icon: Users, color: 'bg-purple-100 text-purple-800 border-purple-200' },
  team_member: { label: 'Team', icon: Users, color: 'bg-green-100 text-green-800 border-green-200' },
  customer: { label: 'Customer', icon: ShoppingBag, color: 'bg-amber-100 text-amber-800 border-amber-200' },
  vendor: { label: 'Vendor', icon: Building2, color: 'bg-gray-100 text-gray-800 border-gray-200' },
  newsletter: { label: 'Newsletter', icon: Megaphone, color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  notification: { label: 'Notification', icon: Bell, color: 'bg-slate-100 text-slate-800 border-slate-200' },
  solicitation: { label: 'Solicitation', icon: Ban, color: 'bg-orange-100 text-orange-800 border-orange-200' },
  spam: { label: 'Spam', icon: AlertTriangle, color: 'bg-red-100 text-red-800 border-red-200' },
  unknown: { label: 'Unknown', icon: Mail, color: 'bg-gray-100 text-gray-600 border-gray-200' },
}

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'bg-red-500 text-white' },
  high: { label: 'High', color: 'bg-orange-500 text-white' },
  normal: { label: 'Normal', color: 'bg-blue-500 text-white' },
  low: { label: 'Low', color: 'bg-gray-400 text-white' },
}

// Format relative time
function formatEmailTime(date) {
  if (!date) return ''
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Classification badge component
function ClassificationBadge({ classification, size = 'sm' }) {
  const config = CLASSIFICATION_CONFIG[classification] || CLASSIFICATION_CONFIG.unknown
  const Icon = config.icon
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1 font-normal",
        config.color,
        size === 'sm' ? 'text-xs h-5 px-1.5' : 'text-xs h-6 px-2'
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {config.label}
    </Badge>
  )
}

// Priority indicator
function PriorityDot({ priority }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("w-2 h-2 rounded-full", config.color.replace('text-white', ''))} />
      </TooltipTrigger>
      <TooltipContent>{config.label} priority</TooltipContent>
    </Tooltip>
  )
}

// Email thread item component
function EmailThreadItem({ email, isSelected, onClick, brandColors }) {
  const isUnread = !email.is_read
  const needsResponse = email.needs_response && !email.responded_at
  const hasDraft = email.draft_status === 'ready'
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 border-b cursor-pointer transition-colors hover:bg-muted/50",
        isSelected && "bg-primary/5 border-l-2",
        isUnread && "bg-muted/30"
      )}
      style={isSelected ? { borderLeftColor: brandColors.primary } : {}}
    >
      <div className="flex items-start gap-3">
        {/* Priority indicator */}
        {needsResponse && (
          <div className="pt-1">
            <PriorityDot priority={email.response_priority} />
          </div>
        )}
        
        {/* Avatar */}
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `color-mix(in srgb, ${brandColors.primary} 15%, transparent)` }}
        >
          {email.contact_avatar ? (
            <img src={email.contact_avatar} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <User className="h-4 w-4" style={{ color: brandColors.primary }} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <p className={cn(
              "text-sm truncate",
              isUnread ? "font-semibold" : "font-medium"
            )}>
              {email.from_name || email.from_email || 'Unknown'}
            </p>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatEmailTime(email.email_date)}
            </span>
          </div>
          
          {/* Subject */}
          <p className={cn(
            "text-sm truncate",
            isUnread ? "font-medium" : "text-muted-foreground"
          )}>
            {email.subject || '(No subject)'}
          </p>
          
          {/* Snippet */}
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {email.snippet}
          </p>
          
          {/* Tags row */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Classification */}
            <ClassificationBadge classification={email.email_classification} />
            
            {/* Matched contact */}
            {email.contact_name && (
              <Badge variant="outline" className="text-xs h-5 px-1.5 bg-background">
                {email.contact_name}
              </Badge>
            )}
            
            {/* Needs response indicator */}
            {needsResponse && (
              <Badge className="text-xs h-5 px-1.5 bg-amber-500 text-white border-0 gap-1">
                <Clock className="h-3 w-3" />
                Reply needed
              </Badge>
            )}
            
            {/* Draft ready indicator */}
            {hasDraft && (
              <Badge className="text-xs h-5 px-1.5 gap-1" style={{ backgroundColor: brandColors.primary, color: 'white' }}>
                <SignalIcon className="h-3 w-3" />
                Draft ready
              </Badge>
            )}
            
            {/* Stars / attachments */}
            {email.is_starred && (
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
            )}
            {email.has_attachments && (
              <Paperclip className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Thread detail view
function ThreadDetailView({ email, brandColors, onReply, onClose, onGenerateDraft, isGeneratingDraft }) {
  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Select an email to view</p>
        </div>
      </div>
    )
  }

  const needsResponse = email.needs_response && !email.responded_at
  const hasDraft = email.draft_status === 'ready'

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Thread Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-lg">{email.subject || '(No subject)'}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-muted-foreground">
                From: {email.from_name || email.from_email}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                {formatEmailTime(email.email_date)}
              </span>
              <ClassificationBadge classification={email.email_classification} size="md" />
            </div>
            
            {/* Contact link if matched */}
            {email.matched_contact_id && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="gap-1">
                  <User className="h-3 w-3" />
                  {email.contact_name || 'Linked contact'}
                </Badge>
                {email.pipeline_stage && (
                  <Badge variant="secondary" className="text-xs">
                    Stage: {email.pipeline_stage}
                  </Badge>
                )}
              </div>
            )}
            
            {/* AI insights */}
            {email.sentiment && (
              <div className="flex items-center gap-2 mt-2">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    email.sentiment === 'positive' && 'bg-green-50 border-green-200 text-green-700',
                    email.sentiment === 'negative' && 'bg-red-50 border-red-200 text-red-700',
                    email.sentiment === 'neutral' && 'bg-gray-50 border-gray-200 text-gray-700'
                  )}
                >
                  Sentiment: {email.sentiment}
                </Badge>
                {email.urgency_level && email.urgency_level !== 'normal' && (
                  <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
                    Urgency: {email.urgency_level}
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            {needsResponse && !hasDraft && (
              <Button 
                size="sm" 
                className="gap-1.5"
                onClick={onGenerateDraft}
                disabled={isGeneratingDraft}
                style={{ 
                  backgroundColor: `color-mix(in srgb, ${brandColors.primary} 15%, transparent)`,
                  color: brandColors.primary 
                }}
              >
                {isGeneratingDraft ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <SignalIcon className="h-4 w-4" />
                    Generate Draft
                  </>
                )}
              </Button>
            )}
            {hasDraft && (
              <Button 
                size="sm" 
                className="gap-1.5"
                onClick={() => onReply()}
                style={{ 
                  backgroundColor: brandColors.primary,
                  color: 'white' 
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                View Draft
              </Button>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onReply}>
                  <Reply className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reply</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Star className="h-4 w-4 mr-2" />
                  Star
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Email content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Thread summary from AI */}
          {email.thread_summary && (
            <Card className="mb-4 border-l-2" style={{ borderLeftColor: brandColors.primary }}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <SignalIcon className="h-4 w-4" style={{ color: brandColors.primary }} />
                  Signal Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-sm text-muted-foreground">{email.thread_summary}</p>
                {email.action_items?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium mb-1">Action items:</p>
                    <ul className="text-xs text-muted-foreground list-disc list-inside">
                      {email.action_items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Email body */}
          <Card className="overflow-hidden">
            <CardHeader className="py-3 px-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `color-mix(in srgb, ${brandColors.primary} 15%, transparent)` }}
                  >
                    <User className="h-4 w-4" style={{ color: brandColors.primary }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{email.from_name || email.from_email}</p>
                    <p className="text-xs text-muted-foreground">
                      to {email.to_emails?.join(', ') || 'me'}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatEmailTime(email.email_date)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: email.body_html || email.body_text || email.snippet }}
              />
            </CardContent>
          </Card>
          
          {/* Reply suggestions from AI */}
          {email.reply_suggestions?.length > 0 && (
            <Card className="mt-4 border-l-2" style={{ borderLeftColor: brandColors.primary }}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" style={{ color: brandColors.primary }} />
                  Suggested Replies
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-2">
                {email.reply_suggestions.map((suggestion, i) => (
                  <Button 
                    key={i}
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-left h-auto py-2 px-3"
                    onClick={() => onReply(suggestion)}
                  >
                    <span className="line-clamp-2 text-xs">{suggestion}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// Inbox stats bar
function InboxStatsBar({ stats, brandColors }) {
  if (!stats) return null
  
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-muted/30 border-b text-xs">
      <div className="flex items-center gap-1.5">
        <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium">{stats.total}</span>
        <span className="text-muted-foreground">total</span>
      </div>
      <div className="flex items-center gap-1.5">
        <MailOpen className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium">{stats.unread}</span>
        <span className="text-muted-foreground">unread</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-amber-500" />
        <span className="font-medium" style={{ color: stats.needsResponse > 0 ? brandColors.primary : undefined }}>
          {stats.needsResponse}
        </span>
        <span className="text-muted-foreground">need reply</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Ban className="h-3.5 w-3.5 text-red-500" />
        <span className="font-medium text-red-600">{stats.spamBlocked + stats.solicitationBlocked}</span>
        <span className="text-muted-foreground">blocked</span>
      </div>
    </div>
  )
}

export default function CRMEmailHub({ brandColors }) {
  const { currentOrg } = useAuthStore()
  
  // State
  const [gmailStatus, setGmailStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [emails, setEmails] = useState([])
  const [inboxStats, setInboxStats] = useState(null)
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeView, setActiveView] = useState('needs_response') // 'all', 'needs_response', 'clients', 'prospects'
  const [showCompose, setShowCompose] = useState(false)
  const [totalEmails, setTotalEmails] = useState(0)
  const [filters, setFilters] = useState({
    includeSpam: false,
    classification: null,
  })
  // CRM contact emails for active client/prospect filtering (lowercase for match)
  const [clientEmailsSet, setClientEmailsSet] = useState(new Set())
  const [prospectEmailsSet, setProspectEmailsSet] = useState(new Set())
  
  // Fetch Gmail status
  const fetchGmailStatus = useCallback(async () => {
    if (!currentOrg?.id) return
    
    try {
      const response = await crmApi.getGmailStatus()
      const status = response.data || response
      setGmailStatus(status)
    } catch (err) {
      console.error('Failed to get Gmail status:', err)
      setGmailStatus({ connected: false })
    }
  }, [currentOrg?.id])
  
  // Sync inbox
  const syncInbox = useCallback(async (forceRefresh = false) => {
    if (!currentOrg?.id || !gmailStatus?.connected) return
    
    setIsSyncing(true)
    try {
      const response = await crmApi.syncFullInbox({ maxEmails: 100, forceRefresh })
      const result = response.data || response
      toast.success(`Synced ${result.synced} emails, ${result.needs_response} need response`)
      
      // Refresh inbox and stats
      await Promise.all([fetchEmails(), fetchInboxStats()])
    } catch (err) {
      console.error('Failed to sync inbox:', err)
      toast.error('Failed to sync inbox')
    } finally {
      setIsSyncing(false)
    }
  }, [currentOrg?.id, gmailStatus?.connected])
  
  // Fetch emails
  const fetchEmails = useCallback(async () => {
    if (!currentOrg?.id || !gmailStatus?.connected) return
    
    try {
      let response
      if (activeView === 'needs_response') {
        response = await crmApi.getEmailsNeedingResponse({ limit: 50 })
      } else {
        response = await crmApi.getClassifiedInbox({
          classification: activeView === 'clients' ? 'client' : activeView === 'prospects' ? 'prospect' : null,
          needsResponse: activeView === 'needs_response' ? true : undefined,
          includeSpam: filters.includeSpam,
          limit: 50,
        })
      }
      
      const data = response.data || response
      setEmails(data.emails || data || [])
      setTotalEmails(data.total || (data.emails || data)?.length || 0)
    } catch (err) {
      console.error('Failed to fetch emails:', err)
    }
  }, [currentOrg?.id, gmailStatus?.connected, activeView, filters])
  
  // Fetch inbox stats
  const fetchInboxStats = useCallback(async () => {
    if (!currentOrg?.id || !gmailStatus?.connected) return
    
    try {
      const response = await crmApi.getInboxStats()
      setInboxStats(response.data || response)
    } catch (err) {
      console.error('Failed to fetch inbox stats:', err)
    }
  }, [currentOrg?.id, gmailStatus?.connected])
  
  // Initial load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      await fetchGmailStatus()
      setIsLoading(false)
    }
    load()
  }, [fetchGmailStatus])
  
  // Fetch emails when connected or view changes
  useEffect(() => {
    if (gmailStatus?.connected) {
      Promise.all([fetchEmails(), fetchInboxStats()])
    }
  }, [gmailStatus?.connected, fetchEmails, fetchInboxStats])
  
  // Load CRM client/prospect emails when Clients or Prospects tab is active (for active filtering)
  useEffect(() => {
    if (!currentOrg?.id || !gmailStatus?.connected) return
    if (activeView !== 'clients' && activeView !== 'prospects') return
    
    const load = async () => {
      try {
        const [clientsRes, prospectsRes] = await Promise.all([
          crmApi.listClients({ limit: 500 }).catch(() => ({ data: { clients: [] } })),
          crmApi.listProspects({ limit: 500 }).catch(() => ({ data: { prospects: [] } })),
        ])
        const clients = clientsRes.data?.clients ?? clientsRes.data ?? []
        const prospects = prospectsRes.data?.prospects ?? prospectsRes.data ?? []
        const toLower = (s) => (s && String(s).trim() ? String(s).trim().toLowerCase() : null)
        setClientEmailsSet(new Set(
          clients.map((c) => toLower(c.email || c.contact_email)).filter(Boolean)
        ))
        setProspectEmailsSet(new Set(
          prospects.map((p) => toLower(p.email)).filter(Boolean)
        ))
      } catch (err) {
        console.error('Failed to load CRM contacts for email filter:', err)
      }
    }
    load()
  }, [currentOrg?.id, gmailStatus?.connected, activeView])
  
  // Filter emails by search and by CRM clients/prospects when tab is Clients or Prospects
  const filteredEmails = emails.filter(email => {
    // Active filter by existing CRM clients / prospects: only show emails from those contacts
    if (activeView === 'clients' && clientEmailsSet.size > 0) {
      const from = email.from_email?.trim().toLowerCase()
      if (!from || !clientEmailsSet.has(from)) return false
    }
    if (activeView === 'prospects' && prospectEmailsSet.size > 0) {
      const from = email.from_email?.trim().toLowerCase()
      if (!from || !prospectEmailsSet.has(from)) return false
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        email.subject?.toLowerCase().includes(query) ||
        email.from_email?.toLowerCase().includes(query) ||
        email.from_name?.toLowerCase().includes(query) ||
        email.snippet?.toLowerCase().includes(query) ||
        email.contact_name?.toLowerCase().includes(query)
      )
    }
    return true
  })
  
  // Handle generate draft
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false)
  const [currentDraft, setCurrentDraft] = useState(null)
  
  const handleGenerateDraft = async (email) => {
    if (!email?.id) return
    
    setIsGeneratingDraft(true)
    try {
      const response = await crmAiApi.generateReplyDraft({
        emailId: email.id,
        threadContext: {
          subject: email.subject,
          fromEmail: email.from_email,
          fromName: email.from_name,
          snippet: email.snippet,
          bodyText: email.body_text,
          emailDate: email.email_date,
          classification: email.email_classification,
          contactName: email.contact_name,
          pipelineStage: email.pipeline_stage,
        },
        businessContext: {
          orgName: currentOrg?.name,
          replyTone: 'professional',
        },
      })
      
      const draft = response.data || response
      setCurrentDraft(draft)
      
      // Update the email in the list to show draft is ready
      setEmails(prev => prev.map(e => 
        e.id === email.id 
          ? { ...e, draft_status: 'ready', signal_draft_id: draft.draftId }
          : e
      ))
      
      // Update selected email too
      if (selectedEmail?.id === email.id) {
        setSelectedEmail(prev => ({ 
          ...prev, 
          draft_status: 'ready',
          signal_draft_id: draft.draftId
        }))
      }
      
      toast.success('Draft generated! Review and send when ready.')
      
      // Open compose with draft
      setShowCompose(true)
    } catch (err) {
      console.error('Failed to generate draft:', err)
      toast.error('Failed to generate draft. Please try again.')
    } finally {
      setIsGeneratingDraft(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: brandColors.primary }} />
          <p className="text-sm text-muted-foreground">Loading email...</p>
        </div>
      </div>
    )
  }
  
  // Show connect prompt if Gmail not connected
  if (!gmailStatus?.connected) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <GmailConnectCard 
            onStatusChange={(status) => {
              setGmailStatus(status)
              if (status.connected) {
                syncInbox()
              }
            }}
          />
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Stats bar */}
      <InboxStatsBar stats={inboxStats} brandColors={brandColors} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Email List Sidebar */}
        <div className="w-96 border-r flex flex-col bg-muted/30">
          {/* Toolbar */}
          <div className="p-3 border-b flex items-center gap-2">
            <Button 
              size="sm"
              className="gap-1.5"
              style={{ backgroundColor: brandColors.primary, color: 'white' }}
              onClick={() => setShowCompose(true)}
            >
              <Plus className="h-4 w-4" />
              Compose
            </Button>
            <div className="flex-1" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => syncInbox(true)}
                  disabled={isSyncing}
                >
                  <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sync inbox</TooltipContent>
            </Tooltip>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={filters.includeSpam}
                  onCheckedChange={(checked) => setFilters(f => ({ ...f, includeSpam: checked }))}
                >
                  Show spam/solicitation
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          {/* View Tabs */}
          <div className="px-3 py-2 border-b">
            <div className="flex gap-1 flex-wrap">
              {[
                { id: 'needs_response', label: 'Need Reply', icon: Clock, count: inboxStats?.needsResponse },
                { id: 'all', label: 'All', icon: Inbox },
                { id: 'clients', label: 'Clients', icon: Building2 },
                { id: 'prospects', label: 'Prospects', icon: Users },
              ].map((view) => (
                <button
                  key={view.id}
                  onClick={() => setActiveView(view.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors",
                    activeView === view.id
                      ? "bg-background border shadow-sm font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <view.icon className="h-3.5 w-3.5" />
                  {view.label}
                  {view.count > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="h-4 px-1 text-[10px]"
                      style={activeView === view.id ? { backgroundColor: brandColors.primary, color: 'white' } : {}}
                    >
                      {view.count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Email List - flex-1 min-h-0 so it scrolls within sidebar */}
          <ScrollArea className="flex-1 min-h-0">
            {filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: `color-mix(in srgb, ${brandColors.primary} 15%, transparent)` }}
                >
                  {activeView === 'needs_response' ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  ) : (
                    <Inbox className="h-6 w-6" style={{ color: brandColors.primary }} />
                  )}
                </div>
                <p className="font-medium mb-1">
                  {activeView === 'needs_response' ? "You're all caught up!" : 'No emails'}
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  {activeView === 'needs_response' 
                    ? 'All emails have been responded to'
                    : 'Sync your inbox to see emails'}
                </p>
                {emails.length === 0 && (
                  <Button 
                    size="sm" 
                    className="mt-4"
                    onClick={() => syncInbox()}
                    disabled={isSyncing}
                    style={{ backgroundColor: brandColors.primary, color: 'white' }}
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1.5" />
                        Sync Inbox
                      </>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              filteredEmails.map((email) => (
                <EmailThreadItem
                  key={email.id}
                  email={email}
                  isSelected={selectedEmail?.id === email.id}
                  onClick={() => setSelectedEmail(email)}
                  brandColors={brandColors}
                />
              ))
            )}
          </ScrollArea>
          
          {/* Gmail Status */}
          <div className="p-3 border-t bg-muted/50">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground truncate">
                {gmailStatus.email}
              </span>
            </div>
          </div>
        </div>
        
        {/* Email Detail */}
        <ThreadDetailView
          email={selectedEmail}
          brandColors={brandColors}
          onReply={() => setShowCompose(true)}
          onClose={() => setSelectedEmail(null)}
          onGenerateDraft={() => handleGenerateDraft(selectedEmail)}
          isGeneratingDraft={isGeneratingDraft}
        />
      </div>
      
      {/* Compose Dialog */}
      <EmailComposeDialog
        open={showCompose}
        onOpenChange={(open) => {
          setShowCompose(open)
          if (!open) setCurrentDraft(null) // Clear draft when closing
        }}
        defaultTo={selectedEmail?.from_email}
        defaultSubject={currentDraft?.subject || (selectedEmail ? `Re: ${selectedEmail.subject}` : '')}
        defaultBody={currentDraft?.body || ''}
        threadId={selectedEmail?.gmail_thread_id}
        onSent={() => {
          // Refresh emails after sending
          fetchEmails()
          fetchInboxStats()
          setCurrentDraft(null)
        }}
      />
    </div>
  )
}
