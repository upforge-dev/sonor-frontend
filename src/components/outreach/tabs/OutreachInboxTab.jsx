import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { cn } from '@/lib/utils'
import {
  Inbox, ThumbsUp, ThumbsDown, MinusCircle, Clock,
  AlertTriangle, ArrowLeft, Building, Mail, MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import { outreachApi } from '@/lib/sonor-api'
import { OutreachStatusBadge, OutreachEmptyState, OutreachLoading } from '@/components/outreach/ui'

const SENTIMENT_CONFIG = {
  positive: { label: 'Positive', icon: ThumbsUp, status: 'positive' },
  negative: { label: 'Negative', icon: ThumbsDown, status: 'negative' },
  neutral: { label: 'Neutral', icon: MinusCircle, status: 'neutral' },
  out_of_office: { label: 'OOO', icon: Clock, status: 'out-of-office' },
  unsubscribe: { label: 'Unsub', icon: AlertTriangle, status: 'unsubscribe' },
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
    return <OutreachLoading />
  }

  if (selectedThread) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" className="gap-2" onClick={() => setSelectedThread(null)}>
          <ArrowLeft className="h-4 w-4" />Back to Inbox
        </Button>
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-[var(--text-primary)]">{selectedThread.subject || 'No subject'}</h3>
          {selectedThread.sentiment && (() => {
            const config = SENTIMENT_CONFIG[selectedThread.sentiment]
            return config ? <OutreachStatusBadge status={config.status} label={config.label} /> : null
          })()}
        </div>
        <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
          <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{selectedThread.email}</span>
          {selectedThread.contacts?.company && <span className="flex items-center gap-1"><Building className="h-3.5 w-3.5" />{selectedThread.contacts.company}</span>}
        </div>

        {messagesLoading ? (
          <OutreachLoading />
        ) : (
          <div className="space-y-4 mt-4">
            {messages.map((msg) => (
              <GlassCard key={msg.id} className={cn(msg.direction === 'inbound' ? 'border-l-4 border-l-[var(--brand-primary)]' : 'border-l-4 border-l-[var(--glass-border-strong)]')}>
                <GlassCardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{msg.direction === 'inbound' ? msg.from_email : `You → ${msg.to_email}`}</span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {new Date(msg.sent_at || msg.received_at || msg.created_at).toLocaleString()}
                    </span>
                  </div>
                  {msg.subject && <p className="text-sm text-[var(--text-secondary)] mb-2">{msg.subject}</p>}
                  <div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: msg.body_html || msg.body_text || '' }} />
                </GlassCardContent>
              </GlassCard>
            ))}
            {messages.length === 0 && (
              <p className="text-center text-[var(--text-secondary)] py-8">No messages in this thread</p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
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
        <OutreachEmptyState
          icon={Inbox}
          title="Inbox is empty"
          description="Replies to your outreach will appear here"
        />
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => {
            const sentimentConfig = SENTIMENT_CONFIG[thread.sentiment]
            return (
              <GlassCard
                key={thread.id}
                hover
                className={cn(thread.status === 'new' && 'border-l-4 border-l-[var(--brand-primary)]/30')}
                onClick={() => handleSelectThread(thread)}
              >
                <GlassCardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('font-medium truncate text-[var(--text-primary)]', thread.status === 'new' && 'font-bold')}>{thread.email}</span>
                        {sentimentConfig && (
                          <OutreachStatusBadge status={sentimentConfig.status} label={sentimentConfig.label} />
                        )}
                        {thread.status === 'new' && <OutreachStatusBadge status="unread" label="New" />}
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] truncate">{thread.subject || 'No subject'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-[var(--text-secondary)]">{thread.last_message_at ? new Date(thread.last_message_at).toLocaleDateString() : ''}</p>
                      <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)] mt-1">
                        <MessageSquare className="h-3 w-3" />{thread.message_count || 0}
                      </div>
                    </div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
