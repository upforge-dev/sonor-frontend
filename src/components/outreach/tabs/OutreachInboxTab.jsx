import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Inbox, Loader2, ThumbsUp, ThumbsDown, MinusCircle, Clock,
  AlertTriangle, ArrowLeft, User, Building, Mail, MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import { outreachApi } from '@/lib/sonor-api'

const SENTIMENT_CONFIG = {
  positive: { label: 'Positive', icon: ThumbsUp, color: 'text-green-600', bg: 'bg-green-100' },
  negative: { label: 'Negative', icon: ThumbsDown, color: 'text-red-600', bg: 'bg-red-100' },
  neutral: { label: 'Neutral', icon: MinusCircle, color: 'text-gray-600', bg: 'bg-gray-100' },
  out_of_office: { label: 'OOO', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
  unsubscribe: { label: 'Unsub', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
}

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'new', label: 'Unread' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'read', label: 'Read' },
  { value: 'closed', label: 'Closed' },
]

export default function OutreachInboxTab() {
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedThread, setSelectedThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)

  const fetchThreads = useCallback(async () => {
    try {
      const { data } = await outreachApi.listThreads({ status: statusFilter || undefined })
      setThreads(data?.data || data || [])
    } catch (err) {
      toast.error('Failed to load inbox')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchThreads() }, [fetchThreads])

  const handleSelectThread = async (thread) => {
    setSelectedThread(thread)
    setMessagesLoading(true)
    try {
      const { data } = await outreachApi.getThreadMessages(thread.id)
      setMessages(data || [])
      if (thread.status === 'new') {
        await outreachApi.markThreadRead(thread.id)
        fetchThreads()
      }
    } catch (err) {
      toast.error('Failed to load messages')
    } finally {
      setMessagesLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (selectedThread) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" className="gap-2" onClick={() => setSelectedThread(null)}>
          <ArrowLeft className="h-4 w-4" />Back to Inbox
        </Button>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">{selectedThread.subject || 'No subject'}</h2>
          {selectedThread.sentiment && (() => {
            const config = SENTIMENT_CONFIG[selectedThread.sentiment]
            return config ? <Badge className={cn(config.bg, config.color, 'gap-1')}><config.icon className="h-3 w-3" />{config.label}</Badge> : null
          })()}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{selectedThread.email}</span>
          {selectedThread.contacts?.company && <span className="flex items-center gap-1"><Building className="h-3.5 w-3.5" />{selectedThread.contacts.company}</span>}
        </div>

        {messagesLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4 mt-4">
            {messages.map((msg) => (
              <Card key={msg.id} className={cn(msg.direction === 'inbound' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-gray-300')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{msg.direction === 'inbound' ? msg.from_email : `You → ${msg.to_email}`}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.sent_at || msg.received_at || msg.created_at).toLocaleString()}
                    </span>
                  </div>
                  {msg.subject && <p className="text-sm text-muted-foreground mb-2">{msg.subject}</p>}
                  <div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: msg.body_html || msg.body_text || '' }} />
                </CardContent>
              </Card>
            ))}
            {messages.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No messages in this thread</p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Unified Inbox</h2>
        <p className="text-muted-foreground">Replies from cold outreach across all sending domains</p>
      </div>

      <div className="flex items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {threads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Inbox is empty</h3>
            <p className="text-muted-foreground">Replies to your outreach will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => {
            const sentimentConfig = SENTIMENT_CONFIG[thread.sentiment]
            return (
              <Card
                key={thread.id}
                className={cn('cursor-pointer hover:shadow-md transition-shadow', thread.status === 'new' && 'border-l-4 border-l-blue-500')}
                onClick={() => handleSelectThread(thread)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('font-medium truncate', thread.status === 'new' && 'font-bold')}>{thread.email}</span>
                        {sentimentConfig && (
                          <Badge variant="outline" className={cn(sentimentConfig.color, 'gap-1 text-xs')}>
                            <sentimentConfig.icon className="h-3 w-3" />{sentimentConfig.label}
                          </Badge>
                        )}
                        {thread.status === 'new' && <Badge className="bg-blue-500 text-white text-xs">New</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{thread.subject || 'No subject'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{thread.last_message_at ? new Date(thread.last_message_at).toLocaleDateString() : ''}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MessageSquare className="h-3 w-3" />{thread.message_count || 0}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
