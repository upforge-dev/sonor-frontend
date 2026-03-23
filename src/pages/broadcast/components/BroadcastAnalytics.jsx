// src/pages/broadcast/components/BroadcastAnalytics.jsx
import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Heart, 
  MessageSquare, 
  Share2, 
  Users,
  RefreshCw,
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useBroadcastAnalytics } from '@/lib/hooks';
import useAuthStore from '@/lib/auth-store';
import { PlatformIcon } from './PlatformIcon';
import { formatDistanceToNow, format } from 'date-fns';

const PERIODS = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
];

function StatCard({ title, value, change, icon: Icon, trend }) {
  const isPositive = change > 0;
  const TrendIcon = isPositive ? ArrowUp : ArrowDown;
  
  return (
    <Card className="bg-[var(--glass-bg)]/80 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-secondary)]">
            <Icon className="h-5 w-5 text-[var(--text-secondary)]" />
          </div>
          {change !== undefined && (
            <Badge 
              variant={isPositive ? 'default' : 'destructive'} 
              className={cn('gap-1', isPositive && 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20')}
            >
              <TrendIcon className="h-3 w-3" />
              {Math.abs(change)}%
            </Badge>
          )}
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-[var(--text-primary)]">{value?.toLocaleString() || 0}</p>
          <p className="text-sm text-[var(--text-tertiary)]">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PlatformCard({ platform, data }) {
  const metrics = [
    { key: 'followers', label: 'Followers', icon: Users },
    { key: 'impressions', label: 'Impressions', icon: Eye },
    { key: 'engagement', label: 'Engagement', icon: Heart },
    { key: 'reach', label: 'Reach', icon: TrendingUp },
  ];

  return (
    <Card className="bg-[var(--glass-bg)]/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={platform} className="h-5 w-5" />
          <CardTitle className="text-base capitalize text-[var(--text-primary)]">{platform}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric) => (
            <div key={metric.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <metric.icon className="h-4 w-4" />
                {metric.label}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)]">
                  {(data?.[metric.key] || 0).toLocaleString()}
                </span>
                {data?.[`${metric.key}Change`] !== undefined && (
                  <span className={cn(
                    'text-xs',
                    data[`${metric.key}Change`] > 0 ? 'text-[var(--brand-primary)]' : 'text-red-500'
                  )}>
                    {data[`${metric.key}Change`] > 0 ? '+' : ''}{data[`${metric.key}Change`]}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TopPostCard({ post }) {
  return (
    <Card className="overflow-hidden bg-[var(--glass-bg)]">
      <div className="flex gap-4 p-4">
        {post.thumbnailUrl && (
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--surface-secondary)]">
            <img 
              src={post.thumbnailUrl} 
              alt="" 
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {post.platforms?.map((p) => (
              <PlatformIcon key={p} platform={p} className="h-4 w-4" />
            ))}
            <span className="text-xs text-[var(--text-tertiary)]">
              {format(new Date(post.publishedAt), 'MMM d, yyyy')}
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{post.content}</p>
          <div className="mt-2 flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {(post.impressions || 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {(post.likes || 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {(post.comments || 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Share2 className="h-3 w-3" />
              {(post.shares || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function BroadcastAnalytics() {
  const { currentProject } = useAuthStore();
  const projectId = currentProject?.id;

  const [period, setPeriod] = useState('7d');
  const [topPosts, setTopPosts] = useState([]);
  const [topPostsLoading, setTopPostsLoading] = useState(false);

  const { data: analytics = {}, isLoading: analyticsLoading, refetch: refetchAnalytics } = useBroadcastAnalytics(projectId, period);

  // Load top posts when period changes
  useEffect(() => {
    if (projectId && analytics?.topPosts) {
      setTopPosts(analytics.topPosts || []);
    }
  }, [projectId, analytics]);

  const handleRefresh = () => {
    refetchAnalytics();
  };

  // Calculate totals from analytics data
  const totals = analytics?.totals || {};
  const platformData = analytics?.byPlatform || {};
  const platforms = Object.keys(platformData);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Social Analytics</h2>
          <p className="text-sm text-[var(--text-tertiary)]">Track your social media performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRefresh}
            disabled={analyticsLoading}
          >
            <RefreshCw className={cn('h-4 w-4', analyticsLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Impressions"
          value={totals.impressions}
          change={totals.impressionsChange}
          icon={Eye}
        />
        <StatCard
          title="Total Engagement"
          value={totals.engagement}
          change={totals.engagementChange}
          icon={Heart}
        />
        <StatCard
          title="Total Reach"
          value={totals.reach}
          change={totals.reachChange}
          icon={TrendingUp}
        />
        <StatCard
          title="Posts Published"
          value={totals.postsPublished}
          change={totals.postsChange}
          icon={BarChart3}
        />
      </div>

      {/* Platform Breakdown */}
      <div>
        <h3 className="mb-4 text-base font-medium text-[var(--text-primary)]">Platform Breakdown</h3>
        {platforms.length === 0 ? (
          <Card className="bg-[var(--glass-bg)]/80 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-8 text-[var(--text-tertiary)]">
              <BarChart3 className="mb-2 h-8 w-8 text-[var(--text-tertiary)]" />
              <p className="text-sm">No platform data available</p>
              <p className="text-xs text-[var(--text-tertiary)]">Connect platforms in Settings to see analytics</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {platforms.map((platform) => (
              <PlatformCard 
                key={platform} 
                platform={platform} 
                data={platformData[platform]} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Top Performing Posts */}
      <div>
        <h3 className="mb-4 text-base font-medium text-[var(--text-primary)]">Top Performing Posts</h3>
        {topPostsLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-[var(--text-tertiary)]" />
          </div>
        ) : topPosts.length === 0 ? (
          <Card className="bg-[var(--glass-bg)]/80 backdrop-blur-sm">
            <CardContent className="p-0">
              <EmptyState.Card
                icon={TrendingUp}
                title="No posts in this period"
                description="Publish some posts to see performance data"
                echoPrompt="How do I improve my social media performance?"
                echoActions={[
                  { label: 'Posting strategy', prompt: 'What posting frequency and timing works best for social media?' },
                  { label: 'Boost engagement', prompt: 'How do I create posts that get more likes, shares, and comments?' },
                ]}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {topPosts.map((post) => (
              <TopPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

      {/* Engagement by Content Type */}
      {analytics?.byContentType && (
        <div>
          <h3 className="mb-4 text-base font-medium text-[var(--text-primary)]">Engagement by Content Type</h3>
          <Card className="bg-[var(--glass-bg)]/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="space-y-4">
                {Object.entries(analytics.byContentType).map(([type, data]) => (
                  <div key={type}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="capitalize text-[var(--text-primary)]">{type}</span>
                      <span className="text-[var(--text-tertiary)]">{data.engagementRate}% engagement</span>
                    </div>
                    <Progress value={data.engagementRate} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default BroadcastAnalytics;
