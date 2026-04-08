// src/pages/broadcast/Broadcast.jsx
// Broadcast module - uses ModuleLayout for consistent shell (left sidebar + main content)
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Calendar, 
  FileText, 
  Settings, 
  RefreshCw, 
  Filter, 
  Search, 
  LayoutGrid, 
  List, 
  BarChart3, 
  MessageSquare,
  Sparkles,
  Radio,
  TrendingUp,
  Upload,
  Library,
  PenSquare,
  Film,
  CircleDot,
} from 'lucide-react';
import { ModuleLayout } from '@/components/ModuleLayout';
import { MODULE_ICONS } from '@/lib/module-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useBroadcastStore } from '@/stores/broadcastStore';
import useAuthStore from '@/lib/auth-store';
import { BroadcastCalendar } from './components/BroadcastCalendar';
// Old composers removed — replaced by UnifiedComposer
// import { PostComposerPage } from './components/PostComposerPage';
// import { ReelComposer } from './components/ReelComposer';
// import { StoryComposer } from './components/StoryComposer';
import { PostsList } from './components/PostsList';
import { BroadcastSettings } from './components/BroadcastSettings';
import { UnifiedInbox } from './components/UnifiedInbox';
import { BroadcastAnalytics } from './components/BroadcastAnalytics';
import { BulkSchedule } from './components/BulkSchedule';
import { MediaLibrary } from './components/MediaLibrary';
import { PlatformIcon } from './components/PlatformIcon';
import { BroadcastOverview } from './components/BroadcastOverview';
import { UnifiedComposer } from './components/UnifiedComposer';
import { BrandMentions } from './components/BrandMentions';
import { toast } from 'sonner';

// =============================================================================
// CONSTANTS
// =============================================================================

const NAV_ITEMS = {
  overview: { id: 'overview', label: 'Overview', icon: Sparkles },
  create: [
    { id: 'compose', label: 'Compose', icon: PenSquare },
  ],
  manage: [
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'posts', label: 'Posts', icon: FileText },
    { id: 'inbox', label: 'Inbox', icon: MessageSquare },
    { id: 'brand-mentions', label: 'Mentions', icon: Radio },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'library', label: 'Library', icon: Library },
  ],
};

// Keyboard shortcuts
const SHORTCUTS = {
  'o': 'overview',
  'n': 'compose',
  'c': 'calendar',
  'p': 'posts',
  'i': 'inbox',
  'm': 'brand-mentions',
  'a': 'analytics',
  'l': 'library',
  's': 'settings',
};

// =============================================================================
// MAIN BROADCAST COMPONENT
// =============================================================================

export function Broadcast({ onNavigate }) {
  const [currentView, setCurrentView] = useState('overview');
  const [editingPost, setEditingPost] = useState(null);
  const [composerDefaults, setComposerDefaults] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  
  const { currentProject } = useAuthStore();
  const selectedProjectId = currentProject?.id;
  const {
    posts,
    connections,
    templates,
    isLoading,
    error,
    inboxUnreadCount,
    fetchPosts,
    fetchConnections,
    fetchTemplates,
    fetchInbox,
  } = useBroadcastStore();
  
  // Computed stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = posts.filter(p => {
      const date = new Date(p.createdAt);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    
    const published = posts.filter(p => p.status === 'published');
    const scheduled = posts.filter(p => p.status === 'scheduled');
    const pending = posts.filter(p => p.approvalStatus === 'pending');
    
    const totalEngagement = published.reduce((sum, p) => {
      const metrics = p.metrics || {};
      return sum + (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
    }, 0);

    const totalReach = published.reduce((sum, p) => {
      const metrics = p.metrics || {};
      return sum + (metrics.reach || 0) + (metrics.impressions || 0);
    }, 0);
    
    return {
      postsThisMonth: thisMonth.length,
      scheduledCount: scheduled.length,
      pendingCount: pending.length,
      totalEngagement,
      totalReach,
      pendingPosts: pending,
      publishedCount: published.length,
    };
  }, [posts]);

  const [showBulkSchedule, setShowBulkSchedule] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [statusFilter, setStatusFilter] = useState([]);
  const [platformFilter, setPlatformFilter] = useState([]);

  // Load data on mount
  useEffect(() => {
    if (selectedProjectId) {
      fetchConnections(selectedProjectId);
      fetchPosts(selectedProjectId);
      fetchTemplates(selectedProjectId);
      fetchInbox(selectedProjectId);
    }
  }, [selectedProjectId, fetchConnections, fetchPosts, fetchTemplates, fetchInbox]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only trigger if not in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      // Navigation shortcuts (Cmd/Ctrl + key)
      if (e.metaKey || e.ctrlKey) {
        const action = SHORTCUTS[e.key.toLowerCase()];
        if (action) {
          e.preventDefault();
          setCurrentView(action);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRefresh = async () => {
    if (!selectedProjectId) return;
    await Promise.all([
      fetchConnections(selectedProjectId),
      fetchPosts(selectedProjectId),
      fetchTemplates(selectedProjectId),
    ]);
    toast.success('Data refreshed');
  };

  // Filter posts
  const filteredPosts = useMemo(() => posts.filter((post) => {
    const matchesSearch = !searchQuery || 
      post.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(post.status);
    const matchesPlatform = platformFilter.length === 0 || 
      post.platforms?.some((p) => platformFilter.includes(p));
    return matchesSearch && matchesStatus && matchesPlatform;
  }), [posts, searchQuery, statusFilter, platformFilter]);

  // Navigation handlers
  const handleCreatePost = useCallback((defaults = {}) => {
    setComposerDefaults(defaults);
    setEditingPost(null);
    if (defaults.postType === 'reel') {
      setCurrentView('reel');
    } else if (defaults.postType === 'story') {
      setCurrentView('story');
    } else {
      setCurrentView('post');
    }
  }, []);

  const handleEditPost = useCallback((post) => {
    setEditingPost(post);
    setComposerDefaults({});
    if (post.postType === 'reel') {
      setCurrentView('reel');
    } else if (post.postType === 'story') {
      setCurrentView('story');
    } else {
      setCurrentView('post');
    }
  }, []);

  const handleComposerComplete = useCallback(() => {
    setEditingPost(null);
    setComposerDefaults({});
    setCurrentView('calendar');
    fetchPosts(selectedProjectId);
  }, [fetchPosts, selectedProjectId]);

  const handleComposerCancel = useCallback(() => {
    setEditingPost(null);
    setComposerDefaults({});
    setCurrentView('calendar');
  }, []);

  // Helper to render current view content
  const renderContent = () => {
    switch (currentView) {
      case 'overview':
        return (
          <BroadcastOverview
            onNavigateToTab={setCurrentView}
            onCreatePost={(options) => {
              setComposerDefaults(options || {});
              setCurrentView('post');
            }}
            onCreateReel={() => setCurrentView('reel')}
            onCreateStory={() => setCurrentView('story')}
            onTopicSelect={(topic) => {
              setComposerDefaults({ topic: topic.title });
              setCurrentView('post');
            }}
          />
        );
      case 'compose':
      case 'post':
      case 'reel':
      case 'story':
        return (
          <UnifiedComposer
            editPost={editingPost}
            defaults={composerDefaults}
            onComplete={handleComposerComplete}
            onCancel={handleComposerCancel}
            connections={connections}
          />
        );
      case 'calendar':
        return (
          <BroadcastCalendar 
            onCreatePost={(date) => handleCreatePost({ scheduledAt: date })}
            onEditPost={handleEditPost}
          />
        );
      case 'posts':
        return (
          <div className="p-6">
            <PostsList
              posts={filteredPosts}
              viewMode={viewMode}
              onEdit={handleEditPost}
              onCreatePost={handleCreatePost}
            />
          </div>
        );
      case 'inbox':
        return <UnifiedInbox />;
      case 'brand-mentions':
        return <BrandMentions />;
      case 'analytics':
        return (
          <div className="p-6">
            <BroadcastAnalytics />
          </div>
        );
      case 'library':
        return (
          <div className="p-6">
            <MediaLibrary
              searchQuery={searchQuery}
              onUseTemplate={(template) => handleCreatePost({ template })}
              onSelectMedia={(media) => handleCreatePost({ media: [media] })}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const headerActions = (
    <>
      {connections.filter(c => c.status === 'active').length > 0 && (
        <div className="hidden md:flex items-center gap-1.5 mr-2">
          {connections.filter(c => c.status === 'active').slice(0, 4).map((conn) => (
            <Tooltip key={conn.id}>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center w-6 h-6 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)]">
                  <PlatformIcon platform={conn.platform} size={12} />
                </div>
              </TooltipTrigger>
              <TooltipContent>{conn.platformAccountName || conn.platform}</TooltipContent>
            </Tooltip>
          ))}
          {connections.filter(c => c.status === 'active').length > 4 && (
            <span className="text-xs text-[var(--text-tertiary)]">+{connections.filter(c => c.status === 'active').length - 4}</span>
          )}
        </div>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh data</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Settings & Connections</TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="h-8 px-3 gap-1.5 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white shadow-sm hover:opacity-90">
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => handleCreatePost({})}>
            <PenSquare className="mr-2 h-4 w-4" />
            New Post
            <kbd className="ml-auto text-xs text-[var(--text-tertiary)]">⌘N</kbd>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCreatePost({ aiMode: true })}>
            <Sparkles className="mr-2 h-4 w-4 text-[var(--brand-primary)]" />
            Post with AI
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleCreatePost({ postType: 'reel' })}>
            <Film className="mr-2 h-4 w-4 text-pink-500" />
            New Reel / Short
            <kbd className="ml-auto text-xs text-[var(--text-tertiary)]">⌘R</kbd>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCreatePost({ postType: 'story' })}>
            <CircleDot className="mr-2 h-4 w-4 text-orange-500" />
            New Story
            <kbd className="ml-auto text-xs text-[var(--text-tertiary)]">⌘T</kbd>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowBulkSchedule(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Schedule
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )

  const leftSidebarContent = (
                <ScrollArea className="h-full py-4">
                  <nav className="space-y-1 px-2">
                    {/* Overview */}
                    <button
                      type="button"
                      data-tour="broadcast-campaigns"
                      onClick={() => setCurrentView('overview')}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
                        currentView === 'overview'
                          ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <Sparkles className={cn("h-4 w-4", currentView === 'overview' && "text-[var(--brand-primary)]")} />
                      Overview
                    </button>

                    {/* Create Section */}
                    <div className="pt-4 pb-1" data-tour="broadcast-editor">
                      <p className="px-3 uppercase tracking-wider text-[var(--text-tertiary)]">Create</p>
                    </div>
                    {NAV_ITEMS.create.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCurrentView(item.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                          currentView === item.id
                            ? "bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white font-medium shadow-sm" 
                            : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    ))}

                    {/* Manage Section */}
                    <div className="pt-4 pb-1" data-tour="broadcast-lists">
                      <p className="px-3 uppercase tracking-wider text-[var(--text-tertiary)]">Manage</p>
                    </div>
                    {NAV_ITEMS.manage.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCurrentView(item.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200",
                          currentView === item.id
                            ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium" 
                            : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <item.icon className={cn("h-4 w-4", currentView === item.id && "text-[var(--brand-primary)]")} />
                          {item.label}
                        </div>
                        {/* Badges for counts */}
                        {item.id === 'inbox' && inboxUnreadCount > 0 && (
                          <Badge className="h-5 min-w-5 bg-[var(--brand-primary)] px-1.5 text-white">
                            {inboxUnreadCount}
                          </Badge>
                        )}
                        {item.id === 'posts' && stats.pendingCount > 0 && (
                          <Badge variant="outline" className="h-5 min-w-5 border-amber-400/50 bg-amber-50 px-1.5 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                            {stats.pendingCount}
                          </Badge>
                        )}
                        {item.id === 'calendar' && stats.scheduledCount > 0 && (
                          <span className="text-[var(--text-tertiary)]">{stats.scheduledCount}</span>
                        )}
                        {item.id === 'posts' && !stats.pendingCount && (
                          <span className="text-[var(--text-tertiary)]">{posts.length}</span>
                        )}
                      </button>
                    ))}

                    {/* Stats Summary */}
                    <div className="pt-6 px-3 space-y-3" data-tour="broadcast-automation">
                      <div className="p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-[var(--text-tertiary)]">This Month</span>
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-lg font-bold text-[var(--text-primary)]">{stats.postsThisMonth}</p>
                            <p className="text-[10px] text-[var(--text-tertiary)]">Posts</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-[var(--text-primary)]">
                              {stats.totalEngagement > 1000 ? `${(stats.totalEngagement/1000).toFixed(1)}k` : stats.totalEngagement}
                            </p>
                            <p className="text-[10px] text-[var(--text-tertiary)]">Engagement</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </nav>
                </ScrollArea>
  )

  return (
    <TooltipProvider>
      <ModuleLayout ariaLabel="Broadcast" leftSidebar={leftSidebarContent} defaultLeftSidebarOpen={true}>
        <ModuleLayout.Header title="Broadcast" icon={MODULE_ICONS.broadcast} actions={headerActions} data-tour="broadcast-overview" />
        <ModuleLayout.Content>
          <div className="bg-[var(--glass-bg)]/30 backdrop-blur-sm">
            {(currentView === 'posts' || currentView === 'library') && (
              <div className="h-12 border-b flex items-center justify-between px-4 bg-[var(--glass-bg)]/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="h-8 w-48 border-[var(--glass-border)] bg-[var(--glass-bg)] pl-9 placeholder:text-[var(--text-tertiary)] focus:border-[var(--brand-primary)] lg:w-64"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 border-[var(--glass-border)] bg-[var(--glass-bg)]">
                        <Filter className="mr-2 h-3.5 w-3.5" />
                        Filters
                        {(statusFilter.length > 0 || platformFilter.length > 0) && (
                          <Badge className="ml-2 h-4 bg-[var(--brand-primary)] text-white text-[10px]">
                            {statusFilter.length + platformFilter.length}
                          </Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                        Status
                      </div>
                      {['draft', 'scheduled', 'published', 'failed'].map((status) => (
                        <DropdownMenuCheckboxItem
                          key={status}
                          checked={statusFilter.includes(status)}
                          onCheckedChange={(checked) => {
                            setStatusFilter(checked ? [...statusFilter, status] : statusFilter.filter(s => s !== status));
                          }}
                        >
                          <span className="capitalize">{status}</span>
                        </DropdownMenuCheckboxItem>
                      ))}
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                        Platform
                      </div>
                      {['facebook', 'instagram', 'linkedin', 'tiktok', 'gbp'].map((platform) => (
                        <DropdownMenuCheckboxItem
                          key={platform}
                          checked={platformFilter.includes(platform)}
                          onCheckedChange={(checked) => {
                            setPlatformFilter(checked ? [...platformFilter, platform] : platformFilter.filter(p => p !== platform));
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <PlatformIcon platform={platform} size={14} />
                            <span className="capitalize">{platform === 'gbp' ? 'Google Business' : platform}</span>
                          </div>
                        </DropdownMenuCheckboxItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { setStatusFilter([]); setPlatformFilter([]); }}>
                        Clear all filters
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="flex rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]">
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-8 w-8 rounded-r-none"
                      onClick={() => setViewMode('grid')}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-8 w-8 rounded-l-none"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Main content area */}
            <div>
              {renderContent()}
            </div>
          </div>
        </ModuleLayout.Content>
      </ModuleLayout>

        {/* Settings Modal */}
        <BroadcastSettings 
          open={showSettings} 
          onOpenChange={setShowSettings} 
        />

        {/* Bulk Schedule Wizard */}
        <BulkSchedule
          open={showBulkSchedule}
          onClose={() => setShowBulkSchedule(false)}
          onComplete={() => {
            setShowBulkSchedule(false);
            fetchPosts(selectedProjectId);
            toast.success('Bulk schedule created');
          }}
        />

    </TooltipProvider>
  );
}

export default Broadcast;
