/**
 * CallsTab - Glass-styled calls list for CRM
 * Features: Call list, audio player, AI summaries, call detail modal
 */
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Play,
  Pause,
  Clock,
  Globe,
  MoreHorizontal,
  Eye,
  Sparkles,
  Loader2,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GlassCard, GlassEmptyState, LeadQualityBadge, SentimentBadge } from './ui'

// Format duration
function formatDuration(seconds) {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Format relative time
function formatRelativeTime(date) {
  if (!date) return ''
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

// Call Row Component
function CallRow({ call, onClick, onLookupBusiness, onPlayRecording }) {
  return (
    <GlassCard 
      padding="md" 
      hover 
      className="cursor-pointer"
      onClick={() => onClick?.(call)}
    >
      <div className="flex items-center gap-4">
        {/* Direction Icon */}
        <div className={cn(
          'p-3 rounded-2xl',
          call.direction === 'inbound' 
            ? 'bg-[#4bbf39]/10' 
            : 'bg-[#39bfb0]/10'
        )}>
          {call.direction === 'inbound' ? (
            <PhoneIncoming className="h-5 w-5 text-[#4bbf39]" />
          ) : (
            <PhoneOutgoing className="h-5 w-5 text-[#39bfb0]" />
          )}
        </div>
        
        {/* Call Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold font-mono text-[var(--text-primary)]">
              {call.phone_number}
            </span>
            {call.contact?.name && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--glass-bg-inset)] text-[var(--text-secondary)]">
                {call.contact.name}
              </span>
            )}
          </div>
          
          {call.ai_summary && (
            <p className="text-sm text-[var(--text-secondary)] mt-1.5 line-clamp-1">
              {call.ai_summary}
            </p>
          )}
          
          <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)] mt-2">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(call.duration)}
            </span>
            <span>{formatRelativeTime(call.created_at)}</span>
          </div>
        </div>
        
        {/* Badges & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <LeadQualityBadge score={call.lead_quality_score} />
            <SentimentBadge sentiment={call.sentiment} />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onClick?.(call)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {call.recording_url && (
                <DropdownMenuItem onClick={() => onPlayRecording?.(call)}>
                  <Play className="h-4 w-4 mr-2" />
                  Play Recording
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onLookupBusiness?.(call)}>
                <Globe className="h-4 w-4 mr-2" />
                Lookup Business
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </GlassCard>
  )
}

// Call Detail Modal
function CallDetailModal({ call, isOpen, onClose, onLookupBusiness }) {
  const [isPlaying, setIsPlaying] = useState(false)

  if (!isOpen || !call) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
        'w-full max-w-2xl max-h-[85vh]',
        'glass-elevated rounded-3xl',
        'flex flex-col overflow-hidden',
        'animate-in zoom-in-95 duration-200'
      )}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-4">
            <div className={cn(
              'p-3 rounded-2xl',
              call.direction === 'inbound' 
                ? 'bg-[#4bbf39]/10' 
                : 'bg-[#39bfb0]/10'
            )}>
              {call.direction === 'inbound' ? (
                <PhoneIncoming className="h-6 w-6 text-[#4bbf39]" />
              ) : (
                <PhoneOutgoing className="h-6 w-6 text-[#39bfb0]" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold font-mono text-[var(--text-primary)]">
                {call.phone_number}
              </h3>
              <p className="text-sm text-[var(--text-tertiary)]">
                {formatDuration(call.duration)} • {new Date(call.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <LeadQualityBadge score={call.lead_quality_score} size="md" />
            <SentimentBadge sentiment={call.sentiment} size="md" />
            <Button variant="ghost" size="sm" onClick={onClose} className="ml-2 rounded-xl">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* AI Summary */}
            {call.ai_summary && (
              <GlassCard padding="md" glow="purple">
                <div className="flex items-center gap-2 text-[#39bfb0] mb-3">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-semibold">AI Summary</span>
                </div>
                <p className="text-[var(--text-primary)] leading-relaxed">{call.ai_summary}</p>
              </GlassCard>
            )}
            
            {/* Audio Player */}
            {call.recording_url && (
              <GlassCard padding="md">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Recording</h4>
                <audio 
                  controls 
                  className="w-full rounded-xl"
                  src={call.recording_url}
                >
                  Your browser does not support the audio element.
                </audio>
              </GlassCard>
            )}
            
            {/* Transcript */}
            {call.openphone_transcript && (
              <GlassCard padding="md">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Transcript</h4>
                <div className="max-h-64 overflow-y-auto rounded-xl bg-[var(--glass-bg-inset)] p-4">
                  <pre className="text-sm whitespace-pre-wrap font-sans text-[var(--text-secondary)]">
                    {call.openphone_transcript}
                  </pre>
                </div>
              </GlassCard>
            )}
            
            {/* Matched Contact */}
            {call.contact && (
              <GlassCard padding="md">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Matched Contact</h4>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center text-white font-semibold">
                    {call.contact.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{call.contact.name}</p>
                    {call.contact.company && (
                      <p className="text-sm text-[var(--text-tertiary)]">{call.contact.company}</p>
                    )}
                  </div>
                </div>
              </GlassCard>
            )}
          </div>
        </ScrollArea>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[var(--glass-border)]">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Close
          </Button>
          <Button onClick={() => onLookupBusiness?.(call)} className="rounded-xl">
            <Globe className="h-4 w-4 mr-2" />
            Lookup Business
          </Button>
        </div>
      </div>
    </>
  )
}

// Main CallsTab Component
export default function CallsTab({
  calls = [],
  summary = {},
  isLoading = false,
  direction = 'all',
  onDirectionChange,
  onCallClick,
  onLookupBusiness,
  onPlayRecording
}) {
  const [selectedCall, setSelectedCall] = useState(null)

  const handleCallClick = (call) => {
    setSelectedCall(call)
    onCallClick?.(call)
  }

  const handleCloseModal = () => {
    setSelectedCall(null)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={direction} onValueChange={onDirectionChange}>
          <SelectTrigger className="w-48 rounded-xl">
            <SelectValue placeholder="All Calls" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Calls</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex-1 text-sm text-[var(--text-secondary)]">
          <span className="text-[#4bbf39] font-medium">{summary.inbound || 0}</span> inbound
          <span className="mx-2">•</span>
          <span className="text-[#39bfb0] font-medium">{summary.outbound || 0}</span> outbound
        </div>
      </div>

      {/* Calls List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
            <p className="text-sm text-[var(--text-tertiary)]">Loading calls...</p>
          </div>
        </div>
      ) : calls.length === 0 ? (
        <GlassEmptyState
          icon={Phone}
          title="No calls yet"
          description="Calls from OpenPhone will appear here automatically"
          size="lg"
        />
      ) : (
        <div className="space-y-3">
          {calls.map(call => (
            <CallRow
              key={call.id}
              call={call}
              onClick={handleCallClick}
              onLookupBusiness={onLookupBusiness}
              onPlayRecording={onPlayRecording}
            />
          ))}
        </div>
      )}

      {/* Call Detail Modal */}
      <CallDetailModal
        call={selectedCall}
        isOpen={!!selectedCall}
        onClose={handleCloseModal}
        onLookupBusiness={onLookupBusiness}
      />
    </div>
  )
}
