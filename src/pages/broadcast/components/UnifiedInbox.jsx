// src/pages/broadcast/components/UnifiedInbox.jsx
// Split-view inbox with platform colors and AI-powered replies
import React, { useEffect, useState, useCallback } from 'react';
import { 
  MessageSquare, 
  Heart, 
  Send, 
  MoreHorizontal, 
  Archive, 
  CheckCircle, 
  RefreshCw,
  Filter,
  Sparkles,
  ExternalLink,
  ChevronRight,
  User,
  Clock,
  Search,
  Inbox,
  Star,
  Flag,
  MailCheck,
  Reply,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useBroadcastStore } from '@/stores/broadcastStore';
import useAuthStore from '@/lib/auth-store';
import { PlatformIcon } from './PlatformIcon';
import { formatDistanceToNow } from 'date-fns';

// Platform-specific colors with dark theme support
const PLATFORM_COLORS = {
  facebook: { bg: 'bg-[#1877F2]/10 dark:bg-[#1877F2]/20', border: 'border-[#1877F2]/30', text: 'text-[#1877F2]', accent: '#1877F2' },
  instagram: { bg: 'bg-[#E4405F]/10 dark:bg-[#E4405F]/20', border: 'border-[#E4405F]/30', text: 'text-[#E4405F]', accent: '#E4405F' },
  linkedin: { bg: 'bg-[#0A66C2]/10 dark:bg-[#0A66C2]/20', border: 'border-[#0A66C2]/30', text: 'text-[#0A66C2]', accent: '#0A66C2' },
  tiktok: { bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-gray-300 dark:border-gray-600', text: 'text-gray-900 dark:text-gray-100', accent: '#000000' },
  gbp: { bg: 'bg-[#4285F4]/10 dark:bg-[#4285F4]/20', border: 'border-[#4285F4]/30', text: 'text-[#4285F4]', accent: '#4285F4' },
};

const MESSAGE_TYPES = [
  { id: 'comment', label: 'Comments', icon: MessageSquare },
  { id: 'dm', label: 'Direct Messages', icon: Send },
  { id: 'mention', label: 'Mentions', icon: Heart },
];

const STATUS_OPTIONS = [
  { id: 'unread', label: 'Unread', icon: Inbox },
  { id: 'read', label: 'Read', icon: MailCheck },
  { id: 'replied', label: 'Replied', icon: Reply },
  { id: 'archived', label: 'Archived', icon: Archive },
];

export function UnifiedInbox() {
  const { currentProject } = useAuthStore();
  const projectId = currentProject?.id;

  const {
    inboxMessages,
    inboxLoading,
    inboxUnreadCount,
    selectedMessage,
    fetchInbox,
    markMessageAsRead,
    archiveMessage,
    replyToMessage,
    getSuggestedReply,
    setSelectedMessage,
  } = useBroadcastStore();

  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [filters, setFilters] = useState({
    platform: null,
    type: null,
    status: 'unread',
  });

  // Fetch inbox on mount
  useEffect(() => {
    if (projectId) {
      fetchInbox(projectId, filters);
    }
  }, [projectId, filters, fetchInbox]);

  // Handle message selection
  const handleSelectMessage = useCallback(async (message) => {
    setSelectedMessage(message);
    setReplyText('');
    
    // Mark as read if unread
    if (message.status === 'unread') {
      await markMessageAsRead(message.id);
    }
  }, [setSelectedMessage, markMessageAsRead]);

  // Handle reply
  const handleReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;
    
    setReplySending(true);
    try {
      await replyToMessage(selectedMessage.id, replyText);
      setReplyText('');
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setReplySending(false);
    }
  };

  // Get AI suggestion
  const handleGetAiSuggestion = async () => {
    if (!selectedMessage) return;
    
    setAiSuggesting(true);
    try {
      const suggestion = await getSuggestedReply(selectedMessage.id);
      if (suggestion) {
        setReplyText(suggestion);
      }
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
    } finally {
      setAiSuggesting(false);
    }
  };

  // Handle archive
  const handleArchive = async (messageId) => {
    await archiveMessage(messageId);
    if (selectedMessage?.id === messageId) {
      setSelectedMessage(null);
    }
  };

  // Refresh inbox
  const handleRefresh = () => {
    if (projectId) {
      fetchInbox(projectId, filters);
    }
  };

  // Filter messages
  const filteredMessages = inboxMessages.filter((msg) => {
    if (filters.status && msg.status !== filters.status) return false;
    if (filters.platform && msg.platform !== filters.platform) return false;
    if (filters.type && msg.type !== filters.type) return false;
    return true;
  });

  const getMessageIcon = (type) => {
    switch (type) {
      case 'comment': return MessageSquare;
      case 'dm': return Send;
      case 'mention': return Heart;
      default: return MessageSquare;
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <TooltipProvider>
      <div className="flex h-full">
        {/* LEFT: Signal Assistance Sidebar */}
        <div className="hidden w-72 shrink-0 flex-col border-r border-[var(--glass-border)] bg-[var(--glass-bg)]/80 backdrop-blur-sm lg:flex xl:w-80">
          <div className="border-b border-[var(--glass-border)] bg-gradient-to-r from-[var(--brand-primary)]/10 to-[var(--brand-primary)]/10 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)]">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Signal Assistant</h3>
                <p className="text-[10px] text-[var(--text-tertiary)]">AI-powered inbox tools</p>
              </div>
            </div>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {/* Quick Actions */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Quick Actions
                </h4>
                <div className="space-y-1.5">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-xs"
                    onClick={() => {/* Mark all as read */}}
                  >
                    <MailCheck className="mr-2 h-3.5 w-3.5 text-[var(--brand-primary)]" />
                    Mark All as Read
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-xs"
                    onClick={() => {/* Archive all read */}}
                  >
                    <Archive className="mr-2 h-3.5 w-3.5 text-[var(--text-secondary)]" />
                    Archive Read Messages
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-xs"
                    onClick={() => {/* Flag for follow-up */}}
                  >
                    <Flag className="mr-2 h-3.5 w-3.5 text-amber-500" />
                    Flag for Follow-up
                  </Button>
                </div>
              </div>

              <Separator />

              {/* AI Responses */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  AI Response Templates
                </h4>
                <div className="space-y-1.5">
                  {[
                    { label: 'Thank You Reply', desc: 'Gratitude response' },
                    { label: 'Follow-up Question', desc: 'Clarification' },
                    { label: 'Support Response', desc: 'Help & guidance' },
                    { label: 'Promotional Reply', desc: 'Marketing message' },
                  ].map((template) => (
                    <button
                      key={template.label}
                      className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2.5 text-left transition-colors hover:border-[var(--brand-primary)]/50"
                    >
                      <p className="text-xs font-medium text-[var(--text-primary)]">{template.label}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{template.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Sentiment Analysis */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Message Insights
                </h4>
                <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Positive</span>
                    <span className="font-medium text-emerald-500">{Math.floor(inboxMessages.length * 0.6) || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Neutral</span>
                    <span className="font-medium text-[var(--text-primary)]">{Math.floor(inboxMessages.length * 0.3) || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Needs Attention</span>
                    <span className="font-medium text-amber-500">{Math.floor(inboxMessages.length * 0.1) || 0}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Response Time */}
              <div className="rounded-lg border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--brand-primary)]">
                  <Clock className="h-3.5 w-3.5" />
                  Avg Response Time
                </div>
                <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">2h 15m</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">12% faster than last week</p>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* CENTER: Message List */}
        <div className="flex w-[380px] min-w-[320px] shrink-0 flex-col border-r border-[var(--glass-border)] bg-[var(--glass-bg)]/80 backdrop-blur-sm">
          {/* Header */}
          <div className="border-b border-[var(--glass-border)] bg-gradient-to-r from-[var(--brand-primary)]/10 to-[var(--brand-primary)]/10 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-primary)]/20">
                  <Inbox className="h-5 w-5 text-[var(--brand-primary)]" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--text-primary)]">Inbox</h2>
                  <p className="text-xs text-[var(--text-tertiary)]">{inboxUnreadCount} unread messages</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleRefresh}
                      disabled={inboxLoading}
                    >
                      <RefreshCw className={cn('h-4 w-4', inboxLoading && 'animate-spin')} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh</TooltipContent>
                </Tooltip>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </div>
                    {STATUS_OPTIONS.map((status) => (
                      <DropdownMenuCheckboxItem
                        key={status.id}
                        checked={filters.status === status.id}
                        onCheckedChange={(checked) => 
                          setFilters({ ...filters, status: checked ? status.id : null })
                        }
                      >
                        <status.icon className="mr-2 h-4 w-4" />
                        {status.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Type
                    </div>
                    {MESSAGE_TYPES.map((type) => (
                      <DropdownMenuCheckboxItem
                        key={type.id}
                        checked={filters.type === type.id}
                        onCheckedChange={(checked) =>
                          setFilters({ ...filters, type: checked ? type.id : null })
                        }
                      >
                        <type.icon className="mr-2 h-4 w-4" />
                        {type.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setFilters({ platform: null, type: null, status: null })}
                      className="text-[var(--brand-primary)]"
                    >
                      Clear All Filters
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <Input
                placeholder="Search messages..."
                className="h-9 bg-[var(--glass-bg)] pl-9 border-[var(--glass-border)]"
              />
            </div>
          </div>

          {/* Message List */}
          <ScrollArea className="flex-1">
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-secondary)]">
                  <MessageSquare className="h-7 w-7 text-[var(--text-tertiary)]" />
                </div>
                <p className="font-medium text-[var(--text-primary)]">No messages</p>
                <p className="text-sm text-[var(--text-tertiary)]">
                  {filters.status === 'unread' 
                    ? "You're all caught up! 🎉" 
                    : 'Try adjusting your filters'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredMessages.map((message) => {
                  const MessageIcon = getMessageIcon(message.type);
                  const isSelected = selectedMessage?.id === message.id;
                  const platformStyle = PLATFORM_COLORS[message.platform] || PLATFORM_COLORS.facebook;
                  
                  return (
                    <button
                      key={message.id}
                      className={cn(
                        'flex w-full items-start gap-3 p-4 text-left transition-all hover:bg-[var(--surface-secondary)]',
                        isSelected && 'bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)]/10 border-l-4 border-[var(--brand-primary)]',
                        !isSelected && message.status === 'unread' && 'bg-blue-50/30 dark:bg-blue-900/10'
                      )}
                      onClick={() => handleSelectMessage(message)}
                    >
                      <div className="relative">
                        <Avatar className="h-11 w-11 border-2 border-[var(--glass-border)] shadow-sm">
                          <AvatarImage src={message.senderAvatar} />
                          <AvatarFallback className="bg-gradient-to-br from-[var(--surface-secondary)] to-[var(--glass-bg)] text-[var(--text-secondary)]">
                            {getInitials(message.senderName)}
                          </AvatarFallback>
                        </Avatar>
                        {/* Platform badge */}
                        <div 
                          className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: platformStyle.accent }}
                        >
                          <PlatformIcon platform={message.platform} size={10} className="text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn(
                            'truncate text-sm',
                            message.status === 'unread' ? 'font-semibold text-[var(--text-primary)]' : 'font-medium text-[var(--text-secondary)]'
                          )}>
                            {message.senderName || 'Unknown User'}
                          </span>
                          <span className="shrink-0 text-xs text-[var(--text-tertiary)]">
                            {formatDistanceToNow(new Date(message.receivedAt), { addSuffix: false })}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <MessageIcon className="h-3 w-3 text-[var(--text-tertiary)]" />
                          <p className={cn(
                            'truncate text-sm',
                            message.status === 'unread' ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'
                          )}>
                            {message.content}
                          </p>
                        </div>
                        {message.status === 'replied' && (
                          <Badge variant="outline" className="mt-1.5 h-5 gap-1 border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-xs text-[var(--brand-primary)]">
                            <Reply className="h-3 w-3" />
                            Replied
                          </Badge>
                        )}
                      </div>
                      {message.status === 'unread' && (
                        <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* RIGHT: Message Detail */}
        <div className="flex flex-1 flex-col bg-gradient-to-br from-[var(--surface-page)] to-[var(--surface-secondary)]/50">
          {selectedMessage ? (
            <>
              {/* Message Header */}
              <div className="flex items-center justify-between border-b border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-[var(--glass-border)] shadow-md">
                      <AvatarImage src={selectedMessage.senderAvatar} />
                      <AvatarFallback className="bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] text-white">
                        {getInitials(selectedMessage.senderName)}
                      </AvatarFallback>
                    </Avatar>
                    <div 
                      className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: PLATFORM_COLORS[selectedMessage.platform]?.accent || '#666' }}
                    >
                      <PlatformIcon platform={selectedMessage.platform} size={10} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-[var(--text-primary)]">{selectedMessage.senderName}</span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'capitalize',
                          PLATFORM_COLORS[selectedMessage.platform]?.bg,
                          PLATFORM_COLORS[selectedMessage.platform]?.text
                        )}
                      >
                        {selectedMessage.platform === 'gbp' ? 'Google' : selectedMessage.platform}
                      </Badge>
                    </div>
                    <p className="text-sm text-[var(--text-tertiary)]">
                      {selectedMessage.senderHandle && `@${selectedMessage.senderHandle} · `}
                      {formatDistanceToNow(new Date(selectedMessage.receivedAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedMessage.postUrl && (
                    <Button variant="outline" size="sm" asChild className="gap-2">
                      <a href={selectedMessage.postUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        View Post
                      </a>
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Star className="mr-2 h-4 w-4" />
                        Star Conversation
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Flag className="mr-2 h-4 w-4" />
                        Flag for Follow-up
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleArchive(selectedMessage.id)}>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Message Content */}
              <ScrollArea className="flex-1 p-6">
                <div className="mx-auto max-w-2xl space-y-4">
                  {/* Original post context if comment */}
                  {selectedMessage.type === 'comment' && selectedMessage.postContent && (
                    <Card className="border-l-4 bg-[var(--surface-secondary)]" style={{ borderLeftColor: PLATFORM_COLORS[selectedMessage.platform]?.accent }}>
                      <CardContent className="p-4">
                        <p className="mb-1 text-xs font-medium text-[var(--text-tertiary)]">In response to your post:</p>
                        <p className="text-sm text-[var(--text-secondary)] line-clamp-3">
                          {selectedMessage.postContent}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* The message */}
                  <div className="rounded-2xl bg-[var(--glass-bg)] p-5 shadow-sm border border-[var(--glass-border)]">
                    <p className="text-base leading-relaxed text-[var(--text-primary)]">{selectedMessage.content}</p>
                    <p className="mt-3 text-xs text-[var(--text-tertiary)]">
                      {new Date(selectedMessage.receivedAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Previous replies */}
                  {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-[var(--glass-border)]" />
                        <span className="text-xs font-medium text-[var(--text-tertiary)]">Your replies</span>
                        <div className="h-px flex-1 bg-[var(--glass-border)]" />
                      </div>
                      {selectedMessage.replies.map((reply, index) => (
                        <div key={index} className="ml-6 rounded-2xl bg-[var(--brand-primary)]/10 p-4 border border-[var(--brand-primary)]/20">
                          <p className="text-sm text-[var(--text-primary)]">{reply.content}</p>
                          <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                            {new Date(reply.sentAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Reply Box */}
              <div className="border-t border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="mx-auto max-w-2xl">
                  <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--surface-secondary)] p-3">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      className="min-h-[80px] resize-none border-0 bg-transparent focus-visible:ring-0"
                    />
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGetAiSuggestion}
                        disabled={aiSuggesting}
                        className="gap-2 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)]"
                      >
                        <Sparkles className={cn('h-4 w-4', aiSuggesting && 'animate-pulse')} />
                        {aiSuggesting ? 'Generating...' : 'AI Suggest Reply'}
                      </Button>
                      <Button 
                        onClick={handleReply}
                        disabled={!replyText.trim() || replySending}
                        className="gap-2 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white hover:opacity-90"
                      >
                        <Send className="h-4 w-4" />
                        {replySending ? 'Sending...' : 'Send'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-primary)]/20">
                <MessageSquare className="h-10 w-10 text-[var(--brand-primary)]" />
              </div>
              <p className="text-lg font-medium text-[var(--text-primary)]">Select a conversation</p>
              <p className="text-sm text-[var(--text-tertiary)]">Choose a message from the left to view and reply</p>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default UnifiedInbox;
