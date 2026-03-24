// src/pages/broadcast/components/BroadcastOverview.jsx
// "Hi Kelly, what will you create today?" - Personalized overview with trending topics
import React, { useEffect, useState, useMemo } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Calendar, 
  Clock, 
  PenSquare, 
  Film, 
  CircleDot,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Info,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/EmptyState';
import { trendsApi } from '@/lib/sonor-api';
import useAuthStore from '@/lib/auth-store';
import { useBroadcastPosts, useBroadcastConnections } from '@/lib/hooks';
import { PlatformIcon } from './PlatformIcon';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getTimeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(date);
}

// =============================================================================
// TRENDING TOPIC CARD
// =============================================================================

function TrendingTopicCard({ topic, index, onClick }) {
  return (
    <Card 
      className={cn(
        'group relative flex-shrink-0 w-48 cursor-pointer transition-all duration-200',
        'border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl',
        'hover:border-[var(--brand-primary)]/30 hover:shadow-lg hover:scale-[1.02]'
      )}
      onClick={() => onClick?.(topic)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <div 
            className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold"
            style={{ 
              backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
              color: 'var(--brand-primary)' 
            }}
          >
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors">
              {topic.title}
            </p>
            {topic.category_name && (
              <Badge variant="secondary" className="mt-1.5 text-[10px]">
                {topic.category_name}
              </Badge>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <TrendingUp className="h-3 w-3 text-emerald-500" />
          <span>Trending now</span>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// TRENDING TOPICS CAROUSEL
// =============================================================================

function TrendingTopicsCarousel({ topics, isLoading, onTopicClick, onRefresh }) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const carouselRef = React.useRef(null);

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (carouselRef.current) {
      setScrollPosition(carouselRef.current.scrollLeft);
    }
  };

  const canScrollLeft = scrollPosition > 0;
  const canScrollRight = carouselRef.current 
    ? scrollPosition < carouselRef.current.scrollWidth - carouselRef.current.clientWidth - 10
    : true;

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-28 w-48 flex-shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!topics || topics.length === 0) {
    return (
      <Card className="border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-inset)]">
        <CardContent>
          <EmptyState
            icon={TrendingUp}
            title="No trending topics yet"
            description="Topics are refreshed daily based on your industry"
            actionLabel={onRefresh ? 'Refresh' : undefined}
            onAction={onRefresh}
            compact
            echoPrompt="What should I post about for my business?"
            echoActions={[
              { label: 'Post ideas', prompt: 'Give me 5 content ideas for my business to post on social media' },
              { label: 'Trending topics', prompt: 'What topics are trending in my industry right now?' },
            ]}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative group">
      {/* Left scroll button */}
      {canScrollLeft && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 z-10 -translate-y-1/2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--surface-page)] shadow-lg"
          onClick={scrollLeft}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Carousel */}
      <div 
        ref={carouselRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
        onScroll={handleScroll}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {topics.map((topic, index) => (
          <TrendingTopicCard 
            key={topic.id} 
            topic={topic} 
            index={index}
            onClick={onTopicClick}
          />
        ))}
      </div>

      {/* Right scroll button */}
      {canScrollRight && (
        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 z-10 -translate-y-1/2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--surface-page)] shadow-lg"
          onClick={scrollRight}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// WEEKLY SCHEDULE PREVIEW
// =============================================================================

function WeeklySchedulePreview({ posts }) {
  const today = new Date();
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  }, []);

  const postsByDay = useMemo(() => {
    const map = {};
    weekDays.forEach(day => {
      const key = day.toISOString().slice(0, 10);
      map[key] = [];
    });
    
    posts?.forEach(post => {
      if (post.scheduledFor && (post.status === 'scheduled' || post.status === 'draft')) {
        const key = new Date(post.scheduledFor).toISOString().slice(0, 10);
        if (map[key]) {
          map[key].push(post);
        }
      }
    });
    
    return map;
  }, [posts, weekDays]);

  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDays.map((day, i) => {
        const key = day.toISOString().slice(0, 10);
        const dayPosts = postsByDay[key] || [];
        const isToday = i === 0;

        return (
          <div 
            key={key}
            className={cn(
              'rounded-xl border p-3 text-center transition-colors',
              isToday 
                ? 'border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/5' 
                : 'border-[var(--glass-border)] bg-[var(--glass-bg)]'
            )}
          >
            <p className={cn(
              'text-xs font-medium uppercase',
              isToday ? 'text-[var(--brand-primary)]' : 'text-[var(--text-tertiary)]'
            )}>
              {isToday ? 'Today' : day.toLocaleDateString('en-US', { weekday: 'short' })}
            </p>
            <p className={cn(
              'text-lg font-bold mt-1',
              isToday ? 'text-[var(--brand-primary)]' : 'text-[var(--text-primary)]'
            )}>
              {day.getDate()}
            </p>
            <div className="mt-2 flex justify-center gap-1">
              {dayPosts.length > 0 ? (
                <>
                  {dayPosts.slice(0, 3).map((post, j) => (
                    <div 
                      key={post.id || j}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: 'var(--brand-primary)' }}
                    />
                  ))}
                  {dayPosts.length > 3 && (
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      +{dayPosts.length - 3}
                    </span>
                  )}
                </>
              ) : (
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--glass-border)]" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// CREATE CONTENT CARD
// =============================================================================

function CreateContentCard({ icon: Icon, title, description, onClick, accent }) {
  return (
    <Card 
      className={cn(
        'group cursor-pointer transition-all duration-200',
        'border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl',
        'hover:border-[var(--brand-primary)]/30 hover:shadow-lg hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div 
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ 
              backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)'
            }}
          >
            <Icon className="h-6 w-6" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
              {title}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BroadcastOverview({ 
  onNavigateToTab,
  onCreatePost,
  onCreateReel,
  onCreateStory,
  onTopicSelect,
}) {
  const { currentProject, user } = useAuthStore();
  
  // Use React Query hooks instead of store
  const { data: postsData } = useBroadcastPosts(currentProject?.id, {}, { enabled: !!currentProject?.id });
  const { data: connections = [] } = useBroadcastConnections(currentProject?.id, { enabled: !!currentProject?.id });
  const posts = postsData?.posts || [];
  
  const [trends, setTrends] = useState([]);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [trendsError, setTrendsError] = useState(null);

  // Get first name for greeting (capitalized)
  const displayName = useMemo(() => {
    let raw = 'there';
    if (user?.full_name) {
      raw = user.full_name.split(' ')[0] || raw;
    } else if (user?.email) {
      raw = user.email.split('@')[0] || raw;
    }
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }, [user]);

  // Get geo and category from project
  const geo = currentProject?.country_code || 'US';
  const categoryId = currentProject?.google_trends_category_id || 0;

  // Fetch trending topics
  useEffect(() => {
    async function loadTrends() {
      if (!currentProject?.id) return;
      
      setLoadingTrends(true);
      setTrendsError(null);
      
      try {
        const result = await trendsApi.getFeed({
          geo,
          type: 'realtime',
          category_id: categoryId > 0 ? categoryId : undefined,
          limit: 15,
        });
        setTrends(result.items || []);
      } catch (err) {
        console.error('Failed to load trends:', err);
        setTrendsError(err.message);
        setTrends([]);
      } finally {
        setLoadingTrends(false);
      }
    }

    loadTrends();
  }, [currentProject?.id, geo, categoryId]);

  const handleRefreshTrends = async () => {
    setLoadingTrends(true);
    try {
      // Trigger a refresh job (admin only, but will fail gracefully)
      await trendsApi.triggerTrending({ geo, category_id: categoryId });
      // Then reload feed
      const result = await trendsApi.getFeed({
        geo,
        type: 'realtime',
        category_id: categoryId > 0 ? categoryId : undefined,
        limit: 15,
      });
      setTrends(result.items || []);
    } catch (err) {
      console.error('Failed to refresh trends:', err);
    } finally {
      setLoadingTrends(false);
    }
  };

  const handleTopicClick = (topic) => {
    if (onTopicSelect) {
      onTopicSelect(topic);
    } else if (onCreatePost) {
      // Pre-fill post composer with the trending topic
      onCreatePost({ topic: topic.title });
    }
  };

  // Count connected platforms
  const connectedCount = connections.filter(c => c.status === 'active').length;
  const hasConnections = connectedCount > 0;

  return (
    <div className="space-y-8 p-6">
      {/* Hero Greeting */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          {getTimeOfDayGreeting()}, {displayName}
        </h1>
        <p className="mt-2 text-lg text-[var(--text-secondary)]">
          What will you create today?
        </p>
      </div>

      {/* Quick Create Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
        <CreateContentCard
          icon={PenSquare}
          title="Create a Post"
          description="Share text, images, or links"
          onClick={() => onNavigateToTab?.('post')}
        />
        <CreateContentCard
          icon={Film}
          title="Create a Reel"
          description="Short-form video content"
          onClick={() => onNavigateToTab?.('reel')}
        />
        <CreateContentCard
          icon={CircleDot}
          title="Create a Story"
          description="24-hour ephemeral content"
          onClick={() => onNavigateToTab?.('story')}
        />
      </div>

      {/* Connection Warning - glass tile with amber accent */}
      {!hasConnections && (
        <Card className="max-w-3xl mx-auto border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl border-l-4 border-l-amber-500/60">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/20">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[var(--text-primary)]">
                No platforms connected
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                Connect your social accounts to start publishing
              </p>
            </div>
            <Button 
              variant="outline"
              className="border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-amber-600 dark:text-amber-400 shrink-0"
              onClick={() => onNavigateToTab?.('settings')}
            >
              Connect Accounts
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Trending Topics Section */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
            >
              <TrendingUp className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Trending Now
              </h2>
              <p className="text-xs text-[var(--text-tertiary)]">
                {currentProject?.google_trends_category_id 
                  ? `Topics trending in your industry` 
                  : 'General trending topics'}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 text-[var(--text-secondary)]"
            onClick={handleRefreshTrends}
            disabled={loadingTrends}
          >
            <RefreshCw className={cn('h-4 w-4', loadingTrends && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        <TrendingTopicsCarousel
          topics={trends}
          isLoading={loadingTrends}
          onTopicClick={handleTopicClick}
          onRefresh={handleRefreshTrends}
        />

        {trendsError && (
          <p className="mt-2 text-sm text-[var(--text-tertiary)] flex items-center gap-2">
            <Info className="h-4 w-4" />
            Couldn't load trends. Check your connection or try again later.
          </p>
        )}
      </div>

      {/* Weekly Schedule Preview */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
            >
              <Calendar className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Your Week
              </h2>
              <p className="text-xs text-[var(--text-tertiary)]">
                Scheduled posts for the next 7 days
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 text-[var(--text-secondary)]"
            onClick={() => onNavigateToTab?.('calendar')}
          >
            View Calendar
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        <WeeklySchedulePreview posts={posts} />
      </div>
    </div>
  );
}

export default BroadcastOverview;
