// src/pages/broadcast/components/PostsList.jsx
// Rich post cards with platform colors, engagement metrics, and quick actions
import React, { useState } from 'react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { 
  MoreHorizontal, 
  Calendar, 
  Clock, 
  Eye, 
  Edit, 
  Copy, 
  Trash2, 
  Send, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Image,
  Video,
  FileText,
  Heart,
  Share2,
  ThumbsUp,
  BarChart2,
} from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  useDeleteBroadcastPost,
  usePublishBroadcastPost,
  useCreateBroadcastPost,
} from '@/lib/hooks';
import useAuthStore from '@/lib/auth-store';
import { PlatformIcon } from './PlatformIcon';

// Platform-specific colors with dark theme support
const PLATFORM_COLORS = {
  facebook: { bg: 'bg-[#1877F2]/10 dark:bg-[#1877F2]/20', border: 'border-[#1877F2]/30 dark:border-[#1877F2]/40', accent: '#1877F2' },
  instagram: { bg: 'bg-[#E4405F]/10 dark:bg-[#E4405F]/20', border: 'border-[#E4405F]/30 dark:border-[#E4405F]/40', accent: '#E4405F' },
  linkedin: { bg: 'bg-[#0A66C2]/10 dark:bg-[#0A66C2]/20', border: 'border-[#0A66C2]/30 dark:border-[#0A66C2]/40', accent: '#0A66C2' },
  tiktok: { bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700', accent: '#000000' },
  gbp: { bg: 'bg-[#4285F4]/10 dark:bg-[#4285F4]/20', border: 'border-[#4285F4]/30 dark:border-[#4285F4]/40', accent: '#4285F4' },
};

const STATUS_CONFIG = {
  draft: { 
    label: 'Draft', 
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', 
    icon: Edit 
  },
  pending: { 
    label: 'Pending', 
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', 
    icon: Clock 
  },
  approved: { 
    label: 'Approved', 
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', 
    icon: CheckCircle 
  },
  scheduled: { 
    label: 'Scheduled', 
    color: 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]', 
    icon: Calendar 
  },
  published: { 
    label: 'Published', 
    color: 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]', 
    icon: CheckCircle 
  },
  partial: { 
    label: 'Partial', 
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', 
    icon: AlertCircle 
  },
  failed: { 
    label: 'Failed', 
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', 
    icon: XCircle 
  },
};

function PostCard({ post, onEdit }) {
  const { currentProject } = useAuthStore();
  const projectId = currentProject?.id;
  
  const deletePostMutation = useDeleteBroadcastPost();
  const publishPostMutation = usePublishBroadcastPost();
  const duplicatePostMutation = useCreateBroadcastPost();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  const isLoading = deletePostMutation.isPending || publishPostMutation.isPending || duplicatePostMutation.isPending;

  const statusConfig = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;
  const isOverdue = post.scheduledAt && isPast(new Date(post.scheduledAt)) && post.status === 'scheduled';
  
  // Get primary platform color
  const primaryPlatform = post.platforms?.[0] || 'facebook';
  const platformColor = PLATFORM_COLORS[primaryPlatform] || PLATFORM_COLORS.facebook;

  // Mock engagement metrics (would come from real data)
  const metrics = post.metrics || {};
  const hasMetrics = metrics.likes || metrics.comments || metrics.shares;

  const handleAction = async (action) => {
    switch (action) {
      case 'approve':
        // TODO: Add approve mutation when available
        console.log('Approve post:', post.id);
        break;
      case 'publish':
        publishPostMutation.mutate({ id: post.id, projectId });
        break;
      case 'duplicate':
        duplicatePostMutation.mutate({ 
          projectId, 
          data: { 
            content: post.content, 
            platforms: post.platforms, 
            hashtags: post.hashtags,
            mediaUrls: post.mediaUrls,
          } 
        });
        break;
      case 'delete':
        deletePostMutation.mutate({ id: post.id, projectId }, {
          onSuccess: () => setShowDeleteDialog(false),
        });
        break;
      case 'reject':
        // TODO: Add reject mutation when available
        console.log('Reject post:', post.id, rejectReason);
        setShowRejectDialog(false);
        setRejectReason('');
        break;
      case 'retry':
        // TODO: Add retry mutation when available
        console.log('Retry post:', post.id);
        break;
    }
  };

  return (
    <TooltipProvider>
      <Card className={cn(
          'group relative overflow-hidden border-2 bg-[var(--glass-bg)] transition-all hover:shadow-lg',
          isOverdue && 'border-red-300 dark:border-red-500/50 bg-red-50/50 dark:bg-red-900/10',
          !isOverdue && platformColor.border
        )}>
          {/* Platform accent bar */}
          <div 
            className="absolute left-0 top-0 h-1 w-full"
            style={{ 
              background: post.platforms?.length > 1 
                ? `linear-gradient(to right, ${post.platforms.map(p => PLATFORM_COLORS[p]?.accent || '#666').join(', ')})`
                : platformColor.accent 
            }}
          />
          
          <CardContent className="p-0">
            {/* Media preview */}
            {post.mediaUrls?.length > 0 && (
              <div className="relative overflow-hidden">
                <div className={cn(
                  'grid gap-0.5',
                  post.mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                )}>
                  {post.mediaUrls.slice(0, 2).map((url, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        'relative aspect-video bg-[var(--surface-secondary)]',
                        post.mediaUrls.length === 1 && 'aspect-[16/9]'
                      )}
                    >
                      <img 
                        src={url} 
                        alt="" 
                        className="h-full w-full object-cover" 
                      />
                      {post.mediaUrls.length > 2 && idx === 1 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xl font-bold text-white backdrop-blur-sm">
                          +{post.mediaUrls.length - 2}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Status badge overlay */}
                <div className="absolute right-2 top-2">
                  <Badge className={cn('gap-1 shadow-sm', statusConfig.color)}>
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig.label}
                  </Badge>
                </div>
              </div>
            )}

            <div className="p-4">
              {/* Header - platforms and actions */}
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-1">
                  {post.platforms?.map((platform) => (
                    <Tooltip key={platform}>
                      <TooltipTrigger>
                        <div className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-full border shadow-sm',
                          PLATFORM_COLORS[platform]?.border || 'border-[var(--glass-border)]',
                          'bg-[var(--glass-bg)]'
                        )}>
                          <PlatformIcon platform={platform} size={14} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span className="capitalize">{platform === 'gbp' ? 'Google Business' : platform}</span>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {/* Status badge when no media */}
                  {!post.mediaUrls?.length && (
                    <Badge className={cn('gap-1', statusConfig.color)}>
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </Badge>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onEdit(post)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Post
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction('duplicate')}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      {post.status === 'pending' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleAction('approve')} className="text-green-600">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShowRejectDialog(true)} className="text-red-600">
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </DropdownMenuItem>
                        </>
                      )}
                      {(post.status === 'approved' || post.status === 'scheduled') && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleAction('publish')}>
                            <Send className="mr-2 h-4 w-4" />
                            Publish Now
                          </DropdownMenuItem>
                        </>
                      )}
                      {(post.status === 'failed' || post.status === 'partial') && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleAction('retry')}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry Failed
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-red-600 focus:bg-red-50 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Title */}
              {post.title && (
                <h3 className="mb-1 font-semibold text-[var(--text-primary)]">{post.title}</h3>
              )}

              {/* Content preview */}
              <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                {post.content}
              </p>

              {/* Hashtags */}
              {post.hashtags?.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {post.hashtags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="outline" className="border-[var(--glass-border)] bg-[var(--surface-secondary)] text-xs font-normal text-[var(--text-secondary)]">
                      #{tag}
                    </Badge>
                  ))}
                  {post.hashtags.length > 4 && (
                    <Badge variant="outline" className="border-[var(--glass-border)] bg-[var(--surface-secondary)] text-xs font-normal text-[var(--text-tertiary)]">
                      +{post.hashtags.length - 4} more
                    </Badge>
                  )}
                </div>
              )}

              {/* Engagement metrics for published posts */}
              {post.status === 'published' && hasMetrics && (
                <div className="mb-3 flex items-center gap-4 rounded-lg bg-[var(--surface-secondary)] p-2">
                  <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                    <Heart className="h-3.5 w-3.5 text-red-500" />
                    <span className="font-medium">{metrics.likes || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                    <span className="font-medium">{metrics.comments || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                    <Share2 className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                    <span className="font-medium">{metrics.shares || 0}</span>
                  </div>
                  {metrics.reach && (
                    <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                      <Eye className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                      <span className="font-medium">{metrics.reach}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-[var(--glass-border)] pt-3 text-xs text-[var(--text-tertiary)]">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {post.scheduledAt ? (
                    <span className={isOverdue ? 'font-medium text-red-600 dark:text-red-400' : ''}>
                      {isOverdue ? 'Overdue: ' : ''}
                      {format(new Date(post.scheduledAt), 'MMM d, h:mm a')}
                    </span>
                  ) : (
                    <span>Not scheduled</span>
                  )}
                </div>
                
                {post.publishedAt && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>{formatDistanceToNow(new Date(post.publishedAt))} ago</span>
                  </div>
                )}
              </div>

              {/* Platform results for published/partial posts */}
              {post.platformResults && Object.keys(post.platformResults).length > 0 && (
                <div className="mt-3 border-t border-[var(--glass-border)] pt-3">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(post.platformResults).map(([platform, result]) => (
                      <Tooltip key={platform}>
                        <TooltipTrigger>
                          <div
                            className={cn(
                              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                              result.success 
                                ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]' 
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            )}
                          >
                            <PlatformIcon platform={platform} size={12} />
                            {result.success ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {result.success 
                            ? `Published to ${platform}` 
                            : `Failed: ${result.error || 'Unknown error'}`
                          }
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Delete confirmation dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Post</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this post? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleAction('delete')}
                className="bg-red-600 hover:bg-red-700"
                disabled={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reject dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Post</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (optional)"
                className="min-h-[100px]"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => handleAction('reject')}
                variant="destructive"
                disabled={isLoading}
              >
                {isLoading ? 'Rejecting...' : 'Reject Post'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
  );
}

function PostListItem({ post, onEdit }) {
  const statusConfig = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;
  const primaryPlatform = post.platforms?.[0] || 'facebook';
  const platformColor = PLATFORM_COLORS[primaryPlatform] || PLATFORM_COLORS.facebook;

  return (
    <div 
      className={cn(
        'group flex items-center gap-4 rounded-xl border-l-4 bg-[var(--glass-bg)] p-4 shadow-sm transition-all hover:shadow-md',
      )}
      style={{ borderLeftColor: platformColor.accent }}
    >
      {/* Media thumbnail */}
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-secondary)]">
        {post.mediaUrls?.[0] ? (
          <img src={post.mediaUrls[0]} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--surface-secondary)] to-[var(--glass-bg)] text-[var(--text-tertiary)]">
            <FileText className="h-6 w-6" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          {post.title && (
            <span className="font-semibold text-[var(--text-primary)]">{post.title}</span>
          )}
          <Badge className={cn('gap-1', statusConfig.color)}>
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </div>
        <p className="line-clamp-1 text-sm text-[var(--text-secondary)]">{post.content}</p>
        <div className="mt-1.5 flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
          <div className="flex items-center gap-1">
            {post.platforms?.map((p) => (
              <div key={p} className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)]">
                <PlatformIcon platform={p} size={10} />
              </div>
            ))}
          </div>
          {post.scheduledAt && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(post.scheduledAt), 'MMM d, h:mm a')}
            </div>
          )}
          {post.status === 'published' && post.metrics && (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-red-400" /> {post.metrics.likes || 0}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3 text-blue-400" /> {post.metrics.comments || 0}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => onEdit(post)}
        className="opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Edit className="mr-2 h-4 w-4" />
        Edit
      </Button>
    </div>
  );
}

export function PostsList({ posts, viewMode = 'grid', onEdit, onCreatePost }) {
  if (posts.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No posts yet"
        description="Create your first post to get started"
        actionLabel={onCreatePost ? 'Create Your First Post' : undefined}
        onAction={onCreatePost ? () => onCreatePost({}) : undefined}
      />
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-3">
        {posts.map((post) => (
          <PostListItem key={post.id} post={post} onEdit={onEdit} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onEdit={onEdit} />
      ))}
    </div>
  );
}

export default PostsList;
