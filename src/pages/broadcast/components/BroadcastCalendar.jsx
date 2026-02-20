// src/pages/broadcast/components/BroadcastCalendar.jsx
// World-class visual calendar - inspired by Meta Business Suite
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Image,
  Video,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Sparkles,
  Eye,
  Copy,
  Send,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { useBroadcastStore } from '@/stores/broadcastStore';
import { PlatformIcon } from './PlatformIcon';

// ============================================================================
// CONSTANTS
// ============================================================================

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Platform-specific colors for calendar cards (dark theme compatible)
const PLATFORM_COLORS = {
  facebook: {
    bg: 'bg-[#1877F2]/10 dark:bg-[#1877F2]/20',
    border: 'border-[#1877F2]/30 dark:border-[#1877F2]/40',
    text: 'text-[#1877F2] dark:text-blue-400',
    accent: '#1877F2',
  },
  instagram: {
    bg: 'bg-gradient-to-br from-[#833AB4]/10 via-[#FD1D1D]/10 to-[#F77737]/10 dark:from-[#833AB4]/20 dark:via-[#FD1D1D]/20 dark:to-[#F77737]/20',
    border: 'border-[#E4405F]/30 dark:border-[#E4405F]/40',
    text: 'text-[#E4405F] dark:text-pink-400',
    accent: '#E4405F',
  },
  linkedin: {
    bg: 'bg-[#0A66C2]/10 dark:bg-[#0A66C2]/20',
    border: 'border-[#0A66C2]/30 dark:border-[#0A66C2]/40',
    text: 'text-[#0A66C2] dark:text-sky-400',
    accent: '#0A66C2',
  },
  tiktok: {
    bg: 'bg-gray-900/5 dark:bg-gray-100/10',
    border: 'border-gray-900/20 dark:border-gray-100/20',
    text: 'text-gray-900 dark:text-gray-100',
    accent: '#000000',
  },
  gbp: {
    bg: 'bg-[#4285F4]/10 dark:bg-[#4285F4]/20',
    border: 'border-[#4285F4]/30 dark:border-[#4285F4]/40',
    text: 'text-[#4285F4] dark:text-blue-300',
    accent: '#4285F4',
  },
};

const STATUS_STYLES = {
  draft: { bg: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700', badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  pending_approval: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-700', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' },
  scheduled: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-700', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  publishing: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-700', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' },
  published: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-700', badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
  partial: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-700', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
  failed: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-700', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
};

const STATUS_ICONS = {
  published: CheckCircle,
  failed: XCircle,
  partial: AlertCircle,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function formatTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// ============================================================================
// POST CARD COMPONENT - With platform colors and hover preview
// ============================================================================

function PostCard({ post, onClick, onAction, compact = false, draggable = true }) {
  const StatusIcon = STATUS_ICONS[post.status];
  const hasMedia = post.media?.length > 0 || post.mediaUrls?.length > 0;
  const isVideo = post.media?.some((m) => m.type === 'video');
  const primaryPlatform = post.platforms?.[0] || 'facebook';
  const platformStyle = PLATFORM_COLORS[primaryPlatform] || PLATFORM_COLORS.facebook;
  const statusStyle = STATUS_STYLES[post.status] || STATUS_STYLES.draft;

  const cardContent = (
    <div
      onClick={() => onClick?.(post)}
      className={cn(
        'group relative cursor-pointer rounded-lg border-l-4 bg-[var(--glass-bg)] p-2 shadow-sm transition-all hover:shadow-md',
        platformStyle.border,
        compact ? 'text-xs' : 'text-sm'
      )}
      style={{ borderLeftColor: platformStyle.accent }}
    >
      {/* Drag Handle */}
      {draggable && (
        <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-50">
          <GripVertical className="h-3 w-3 text-[var(--text-tertiary)]" />
        </div>
      )}
      
      {/* Time and Status */}
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 font-medium text-[var(--text-secondary)]">
          <Clock className="h-3 w-3" />
          {formatTime(post.scheduledFor || post.scheduledAt)}
        </span>
        <div className="flex items-center gap-1">
          <Badge className={cn('h-4 px-1.5 text-[10px] font-medium', statusStyle.badge)}>
            {post.status === 'pending_approval' ? 'Pending' : post.status}
          </Badge>
          {StatusIcon && <StatusIcon className="h-3 w-3 text-[var(--text-tertiary)]" />}
        </div>
      </div>

      {/* Content Preview */}
      <p className={cn('text-[var(--text-primary)] line-clamp-2', compact && 'line-clamp-1')}>
        {post.content}
      </p>

      {/* Bottom Row: Media + Platforms */}
      <div className="mt-1.5 flex items-center justify-between">
        {/* Media Indicator */}
        {hasMedia ? (
          <div className="flex items-center gap-1 text-[var(--text-tertiary)]">
            {isVideo ? (
              <Video className="h-3 w-3" />
            ) : (
              <Image className="h-3 w-3" />
            )}
            <span className="text-[10px]">
              {post.media?.length || post.mediaUrls?.length} media
            </span>
          </div>
        ) : (
          <span />
        )}
        
        {/* Platforms */}
        <div className="flex -space-x-1">
          {post.platforms?.slice(0, 4).map((platform) => (
            <div
              key={platform}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-sm"
            >
              <PlatformIcon platform={platform} size={12} />
            </div>
          ))}
          {(post.platforms?.length || 0) > 4 && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--surface-secondary)] text-[9px] font-medium text-[var(--text-secondary)] shadow-sm">
              +{post.platforms.length - 4}
            </div>
          )}
        </div>
      </div>

      {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-6 w-6 bg-[var(--glass-bg)]/80 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => onAction?.('edit', post)}>
            <Eye className="mr-2 h-4 w-4" />
            View & Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction?.('duplicate', post)}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </DropdownMenuItem>
          {post.status === 'scheduled' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction?.('publish', post)}>
                <Send className="mr-2 h-4 w-4" />
                Publish Now
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onAction?.('delete', post)}
            className="text-red-600 focus:bg-red-50 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // Wrap in HoverCard for preview on larger screens
  if (!compact) {
    return (
      <HoverCard openDelay={300}>
        <HoverCardTrigger asChild>
          {cardContent}
        </HoverCardTrigger>
        <HoverCardContent side="right" className="w-80 p-0">
          <PostPreviewCard post={post} />
        </HoverCardContent>
      </HoverCard>
    );
  }

  return cardContent;
}

// ============================================================================
// POST PREVIEW CARD - Shown on hover
// ============================================================================

function PostPreviewCard({ post }) {
  const hasMedia = post.media?.length > 0 || post.mediaUrls?.length > 0;
  const mediaUrl = post.media?.[0]?.url || post.mediaUrls?.[0];
  const statusStyle = STATUS_STYLES[post.status] || STATUS_STYLES.draft;

  return (
    <div className="overflow-hidden rounded-lg">
      {/* Media Preview */}
      {hasMedia && mediaUrl && (
        <div className="relative aspect-video bg-[var(--surface-secondary)]">
          <img
            src={mediaUrl}
            alt="Post media"
            className="h-full w-full object-cover"
          />
          {(post.media?.length || post.mediaUrls?.length) > 1 && (
            <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-xs text-white">
              +{(post.media?.length || post.mediaUrls?.length) - 1} more
            </div>
          )}
        </div>
      )}
      
      {/* Content */}
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex -space-x-1">
            {post.platforms?.map((platform) => (
              <div
                key={platform}
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-sm"
              >
                <PlatformIcon platform={platform} size={14} />
              </div>
            ))}
          </div>
          <Badge className={cn('text-xs', statusStyle.badge)}>
            {post.status === 'pending_approval' ? 'Pending Approval' : post.status}
          </Badge>
        </div>
        
        <p className="mb-3 text-sm text-[var(--text-primary)] line-clamp-4">
          {post.content}
        </p>
        
        <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {post.scheduledFor 
              ? new Date(post.scheduledFor).toLocaleString()
              : 'Not scheduled'
            }
          </span>
        </div>
        
        {/* Engagement metrics if published */}
        {post.status === 'published' && post.metrics && (
          <div className="mt-3 flex gap-4 border-t border-[var(--glass-border)] pt-3 text-xs">
            <span className="text-[var(--text-secondary)]">
              ❤️ {post.metrics.likes || 0}
            </span>
            <span className="text-[var(--text-secondary)]">
              💬 {post.metrics.comments || 0}
            </span>
            <span className="text-[var(--text-secondary)]">
              🔄 {post.metrics.shares || 0}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DAY CELL COMPONENT - Enhanced with visual polish
// ============================================================================

function DayCell({ date, posts, isToday, isCurrentMonth, onAddPost, onPostClick, onPostAction }) {
  const sortedPosts = useMemo(() => {
    return [...(posts || [])].sort((a, b) => {
      const timeA = new Date(a.scheduledFor || a.scheduledAt).getTime();
      const timeB = new Date(b.scheduledFor || b.scheduledAt).getTime();
      return timeA - timeB;
    });
  }, [posts]);

  const displayPosts = sortedPosts.slice(0, 3);
  const hiddenCount = sortedPosts.length - displayPosts.length;

  // Platform summary for posts
  const platformSummary = useMemo(() => {
    const platforms = {};
    sortedPosts.forEach(post => {
      post.platforms?.forEach(p => {
        platforms[p] = (platforms[p] || 0) + 1;
      });
    });
    return platforms;
  }, [sortedPosts]);

  return (
    <div
      className={cn(
        'group relative min-h-[120px] border-b border-r border-[var(--glass-border)] p-1.5 transition-colors',
        !isCurrentMonth && 'bg-[var(--surface-secondary)]/50',
        isToday && 'bg-[var(--brand-primary)]/10',
        'hover:bg-[var(--surface-secondary)]/80'
      )}
    >
      {/* Day Header */}
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors',
              isToday && 'bg-[var(--brand-primary)] text-white shadow-sm',
              !isToday && isCurrentMonth && 'text-[var(--text-primary)] group-hover:bg-[var(--surface-secondary)]',
              !isCurrentMonth && 'text-[var(--text-tertiary)]'
            )}
          >
            {date.getDate()}
          </span>
          {/* Platform dots for quick overview */}
          {Object.keys(platformSummary).length > 0 && (
            <div className="hidden sm:flex -space-x-0.5">
              {Object.keys(platformSummary).slice(0, 3).map(platform => (
                <div
                  key={platform}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: PLATFORM_COLORS[platform]?.accent || '#666' }}
                />
              ))}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => onAddPost?.(date)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Posts */}
      <div className="space-y-1">
        {displayPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            compact
            onClick={onPostClick}
            onAction={onPostAction}
          />
        ))}

        {hiddenCount > 0 && (
          <button
            className="w-full rounded-md bg-[var(--surface-secondary)]/80 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-secondary)]"
            onClick={() => {
              // Could open a modal or day view
            }}
          >
            +{hiddenCount} more posts
          </button>
        )}
      </div>
      
      {/* Empty state hover */}
      {sortedPosts.length === 0 && isCurrentMonth && (
        <div className="absolute inset-2 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onAddPost?.(date)}
            className="flex items-center gap-1 rounded-lg border-2 border-dashed border-[var(--glass-border)] px-3 py-2 text-xs text-[var(--text-tertiary)] transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
          >
            <Plus className="h-3 w-3" />
            Schedule post
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MONTH VIEW - Enhanced with better header and styling
// ============================================================================

function MonthView({ year, month, posts, onAddPost, onPostClick, onPostAction }) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();

  // Build calendar grid
  const weeks = useMemo(() => {
    const grid = [];
    let currentWeek = [];

    // Add padding days from previous month
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

    for (let i = firstDay - 1; i >= 0; i--) {
      currentWeek.push({
        date: new Date(prevYear, prevMonth, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      currentWeek.push({
        date,
        isCurrentMonth: true,
        isToday: isSameDay(date, today),
      });

      if (currentWeek.length === 7) {
        grid.push(currentWeek);
        currentWeek = [];
      }
    }

    // Add padding days from next month
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    let nextDay = 1;

    while (currentWeek.length < 7 && currentWeek.length > 0) {
      currentWeek.push({
        date: new Date(nextYear, nextMonth, nextDay++),
        isCurrentMonth: false,
      });
    }

    if (currentWeek.length > 0) {
      grid.push(currentWeek);
    }

    return grid;
  }, [year, month, daysInMonth, firstDay]);

  // Group posts by date
  const postsByDate = useMemo(() => {
    const grouped = {};
    for (const post of posts || []) {
      const dateStr = new Date(post.scheduledFor || post.scheduledAt)
        .toISOString()
        .split('T')[0];
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(post);
    }
    return grouped;
  }, [posts]);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-sm">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-[var(--glass-border)] bg-gradient-to-r from-[var(--surface-secondary)] to-[var(--surface-secondary)]/50">
        {DAYS_OF_WEEK.map((day, idx) => (
          <div
            key={day}
            className={cn(
              'px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]',
              idx < 6 && 'border-r border-[var(--glass-border)]/50'
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="divide-y divide-[var(--glass-border)]/50">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 divide-x divide-[var(--glass-border)]/50">
            {week.map((day, dayIdx) => {
              const dateStr = day.date.toISOString().split('T')[0];
              return (
                <DayCell
                  key={dayIdx}
                  date={day.date}
                  posts={postsByDate[dateStr]}
                  isToday={day.isToday}
                  isCurrentMonth={day.isCurrentMonth}
                  onAddPost={onAddPost}
                  onPostClick={onPostClick}
                  onPostAction={onPostAction}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// WEEK VIEW
// ============================================================================

function WeekView({ weekStart, posts, onAddPost, onPostClick, onPostAction }) {
  const today = new Date();

  const days = useMemo(() => {
    const result = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      result.push(date);
    }
    return result;
  }, [weekStart]);

  // Group posts by date
  const postsByDate = useMemo(() => {
    const grouped = {};
    for (const post of posts || []) {
      const dateStr = new Date(post.scheduledFor || post.scheduledAt)
        .toISOString()
        .split('T')[0];
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(post);
    }
    return grouped;
  }, [posts]);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--glass-border)]">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-[var(--glass-border)] bg-[var(--surface-secondary)]">
        {days.map((date, idx) => (
          <div
            key={idx}
            className={cn(
              'border-r border-[var(--glass-border)] px-2 py-2 text-center last:border-r-0',
              isSameDay(date, today) && 'bg-[var(--brand-primary)]/10'
            )}
          >
            <div className="text-sm font-medium text-[var(--text-tertiary)]">
              {DAYS_OF_WEEK[date.getDay()]}
            </div>
            <div
              className={cn(
                'mt-1 flex h-8 w-8 items-center justify-center rounded-full mx-auto text-lg',
                isSameDay(date, today) && 'bg-[var(--brand-primary)] text-white'
              )}
            >
              {date.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Day Columns */}
      <div className="grid grid-cols-7 divide-x">
        {days.map((date, idx) => {
          const dateStr = date.toISOString().split('T')[0];
          const dayPosts = postsByDate[dateStr] || [];

          return (
            <div
              key={idx}
              className={cn(
                'min-h-[400px] p-2',
                isSameDay(date, today) && 'bg-blue-50/50'
              )}
            >
              <Button
                variant="ghost"
                size="sm"
                className="mb-2 w-full"
                onClick={() => onAddPost?.(date)}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Post
              </Button>

              <div className="space-y-2">
                {dayPosts
                  .sort((a, b) => {
                    const timeA = new Date(a.scheduledFor || a.scheduledAt).getTime();
                    const timeB = new Date(b.scheduledFor || b.scheduledAt).getTime();
                    return timeA - timeB;
                  })
                  .map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onClick={onPostClick}
                      onAction={onPostAction}
                    />
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// DAY VIEW
// ============================================================================

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function DayView({ date, posts, onAddPost, onPostClick, onPostAction }) {
  // Group posts by hour
  const postsByHour = useMemo(() => {
    const grouped = {};
    for (const post of posts || []) {
      const postDate = new Date(post.scheduledFor || post.scheduledAt);
      const hour = postDate.getHours();
      if (!grouped[hour]) {
        grouped[hour] = [];
      }
      grouped[hour].push(post);
    }
    return grouped;
  }, [posts]);

  // Get best posting times (mock optimal times based on typical engagement)
  const optimalHours = [9, 12, 17, 19]; // 9am, 12pm, 5pm, 7pm

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]">
      {/* Day Header */}
      <div className="border-b border-[var(--glass-border)] bg-[var(--surface-secondary)] p-4 text-center">
        <div className="text-lg font-semibold text-[var(--text-primary)]">
          {DAYS_OF_WEEK[date.getDay()]}, {MONTHS[date.getMonth()]} {date.getDate()}
        </div>
        <div className="text-sm text-[var(--text-tertiary)]">
          {(posts || []).length} posts scheduled
        </div>
      </div>

      {/* Time Slots */}
      <div className="max-h-[600px] overflow-y-auto">
        {HOURS.map((hour) => {
          const hourPosts = postsByHour[hour] || [];
          const isOptimal = optimalHours.includes(hour);
          const formattedHour = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;

          return (
            <div
              key={hour}
              className={cn(
                'flex min-h-[60px] border-b border-[var(--glass-border)]',
                isOptimal && 'bg-[var(--brand-primary)]/5'
              )}
            >
              {/* Hour Label */}
              <div className="flex w-20 flex-shrink-0 items-start justify-end border-r border-[var(--glass-border)] p-2">
                <span className="text-xs text-[var(--text-tertiary)]">{formattedHour}</span>
                {isOptimal && (
                  <span className="ml-1 text-xs text-[var(--brand-primary)]">★</span>
                )}
              </div>

              {/* Posts */}
              <div className="flex-1 p-2">
                {hourPosts.length > 0 ? (
                  <div className="space-y-2">
                    {hourPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onClick={onPostClick}
                        onAction={onPostAction}
                      />
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      const newDate = new Date(date);
                      newDate.setHours(hour, 0, 0, 0);
                      onAddPost?.(newDate);
                    }}
                    className="flex h-full w-full items-center justify-center rounded border-2 border-dashed border-transparent text-[var(--text-tertiary)] transition-colors hover:border-[var(--glass-border)] hover:text-[var(--text-secondary)]"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    <span className="text-xs">Add post</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="border-t border-[var(--glass-border)] bg-[var(--surface-secondary)] p-2 text-center text-xs text-[var(--text-tertiary)]">
        <span className="text-[var(--brand-primary)]">★</span> Optimal posting times based on typical engagement patterns
      </div>
    </div>
  );
}

// ============================================================================
// MAIN CALENDAR COMPONENT
// ============================================================================

export function BroadcastCalendar({
  projectId,
  onCreatePost,
  onEditPost,
  onDeletePost,
  onPublishPost,
}) {
  const {
    calendarData,
    calendarView,
    calendarLoading,
    fetchCalendar,
    setCalendarView,
    openComposer,
    duplicatePost,
    publishPost,
    deletePost,
  } = useBroadcastStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Fetch calendar data when date/view changes
  useEffect(() => {
    if (projectId) {
      const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

      fetchCalendar(projectId, {
        view: calendarView,
        startDate,
        endDate,
      });
    }
  }, [projectId, currentYear, currentMonth, calendarView, fetchCalendar]);

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get week start for week view
  const getWeekStart = () => {
    const date = new Date(currentDate);
    const day = date.getDay();
    date.setDate(date.getDate() - day);
    return date;
  };

  // Extract posts from calendar data
  const posts = useMemo(() => {
    if (!calendarData?.days) return [];
    return calendarData.days.flatMap((day) => day.posts || []);
  }, [calendarData]);

  // Handlers
  const handleAddPost = (date) => {
    const scheduledFor = date.toISOString();
    openComposer('create', { scheduledFor });
    onCreatePost?.(scheduledFor);
  };

  const handlePostClick = (post) => {
    onEditPost?.(post);
    openComposer('edit', post);
  };

  const handlePostAction = async (action, post) => {
    switch (action) {
      case 'edit':
        handlePostClick(post);
        break;
      case 'duplicate':
        await duplicatePost(post.id);
        break;
      case 'publish':
        await publishPost(post.id);
        onPublishPost?.(post);
        break;
      case 'delete':
        if (window.confirm('Are you sure you want to delete this post?')) {
          await deletePost(post.id);
          onDeletePost?.(post);
        }
        break;
    }
  };

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col p-6">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-sm">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-r-none" onClick={goToPreviousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Previous month</TooltipContent>
              </Tooltip>
              <Button variant="ghost" size="sm" className="h-9 px-4 font-medium" onClick={goToToday}>
                Today
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-l-none" onClick={goToNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Next month</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher */}
            <div className="flex rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-sm">
              {['month', 'week', 'day'].map((view, idx) => (
                <Button
                  key={view}
                  variant={calendarView === view ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-9 capitalize',
                    idx === 0 && 'rounded-r-none',
                    idx === 1 && 'rounded-none border-x',
                    idx === 2 && 'rounded-l-none'
                  )}
                  onClick={() => setCalendarView(view)}
                >
                  {view}
                </Button>
              ))}
            </div>

            <Button 
              onClick={() => handleAddPost(new Date())}
              className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white shadow-sm hover:opacity-90"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        {calendarData && (
          <div className="mb-4 flex flex-wrap items-center gap-6 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-500 dark:bg-blue-500/10">
                <CalendarIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Total</p>
                <p className="font-semibold text-[var(--text-primary)]">{calendarData.totalPosts}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-[var(--glass-border)]" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Scheduled</p>
                <p className="font-semibold text-[var(--text-primary)]">{calendarData.scheduledCount}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-[var(--glass-border)]" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Published</p>
                <p className="font-semibold text-[var(--text-primary)]">{calendarData.publishedCount}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-[var(--glass-border)]" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Drafts</p>
                <p className="font-semibold text-[var(--text-primary)]">{calendarData.draftCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Calendar View - Fill remaining space */}
        <div className="flex-1 overflow-hidden">
          {calendarLoading ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
                <p className="text-sm text-[var(--text-tertiary)]">Loading calendar...</p>
              </div>
            </div>
          ) : calendarView === 'month' ? (
            <MonthView
              year={currentYear}
              month={currentMonth}
              posts={posts}
              onAddPost={handleAddPost}
              onPostClick={handlePostClick}
              onPostAction={handlePostAction}
            />
          ) : calendarView === 'week' ? (
            <WeekView
              weekStart={getWeekStart()}
              posts={posts}
              onAddPost={handleAddPost}
              onPostClick={handlePostClick}
              onPostAction={handlePostAction}
            />
          ) : calendarView === 'day' ? (
            <DayView
              date={currentDate}
              posts={posts.filter((post) => {
                const postDate = new Date(post.scheduledFor || post.scheduledAt);
                return isSameDay(postDate, currentDate);
              })}
              onAddPost={handleAddPost}
              onPostClick={handlePostClick}
              onPostAction={handlePostAction}
            />
          ) : null}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default BroadcastCalendar;
